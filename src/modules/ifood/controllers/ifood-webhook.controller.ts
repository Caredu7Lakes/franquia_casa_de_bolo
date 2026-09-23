import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { IfoodOrderService } from '../services/ifood-order.service';
import { IfoodClient } from '../ifood.client';

/**
 * Webhook do iFood (módulo Events).
 * O iFood envia um array de eventos. Respondemos 200 na hora, processamos em
 * background, e damos acknowledgment dos eventos (senão o iFood reenvia).
 *
 * Códigos de evento relevantes: PLC (PLACED), CFM (CONFIRMED). É neles que há
 * um pedido novo para puxar o detalhe.
 */
@Controller('ifood/webhook')
export class IfoodWebhookController {
  private readonly logger = new Logger(IfoodWebhookController.name);

  constructor(
    private readonly orderService: IfoodOrderService,
    private readonly ifoodClient: IfoodClient,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  handleWebhook(@Body() body: any) {
    // O iFood pode mandar um evento único ou um array.
    const events = Array.isArray(body) ? body : [body];

    // Processa sem bloquear a resposta.
    this.process(events).catch((err) =>
      this.logger.error('Erro ao processar eventos iFood', err?.message || err),
    );

    return { received: true };
  }

  private async process(events: any[]): Promise<void> {
    const ingestCodes = new Set(['PLC', 'PLACED', 'CFM', 'CONFIRMED']);
    for (const ev of events) {
      const code = ev.code || ev.fullCode;
      if (ingestCodes.has(code) && ev.orderId) {
        try {
          await this.orderService.ingestOrder(ev.orderId);
        } catch (e: any) {
          this.logger.error(`Falha ao ingerir pedido ${ev.orderId}`, e?.message || e);
        }
      }
    }
    // Confirma todos os eventos recebidos.
    const ids = events.map((e) => e.id).filter(Boolean);
    try {
      await this.ifoodClient.acknowledgeEvents(ids);
    } catch (e: any) {
      this.logger.error('Falha no acknowledgment', e?.message || e);
    }
  }
}