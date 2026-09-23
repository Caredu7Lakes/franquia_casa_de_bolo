import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

/**
 * Cliente da API do iFood (Merchant API).
 * Autenticação client_credentials: troca client_id/secret por access_token.
 * O token é cacheado em memória até expirar.
 */
@Injectable()
export class IfoodClient {
  private readonly logger = new Logger(IfoodClient.name);
  private readonly baseUrl = 'https://merchant-api.ifood.com.br';
  private readonly clientId = process.env.IFOOD_CLIENT_ID || '';
  private readonly clientSecret = process.env.IFOOD_CLIENT_SECRET || '';

  private token: string | null = null;
  private tokenExpiresAt = 0;

  private async getToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiresAt) return this.token;

    const params = new URLSearchParams();
    params.append('grantType', 'client_credentials');
    params.append('clientId', this.clientId);
    params.append('clientSecret', this.clientSecret);

    const { data } = await axios.post(
      `${this.baseUrl}/authentication/v1.0/oauth/token`,
      params,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } },
    );
    this.token = data.accessToken;
    // Renova 60s antes do vencimento real.
    this.tokenExpiresAt = Date.now() + (data.expiresIn - 60) * 1000;
    return this.token as string;
  }

  /** Detalhe completo de um pedido (itens, cliente, total). */
  async getOrderDetails(orderId: string): Promise<any> {
    const token = await this.getToken();
    const { data } = await axios.get(
      `${this.baseUrl}/order/v1.0/orders/${orderId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return data;
  }

  /** Confirma recebimento do evento (obrigatório no fluxo do iFood). */
  async acknowledgeEvents(eventIds: string[]): Promise<void> {
    if (!eventIds.length) return;
    const token = await this.getToken();
    await axios.post(
      `${this.baseUrl}/events/v1.0/events/acknowledgment`,
      eventIds.map((id) => ({ id })),
      { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
    );
  }
}