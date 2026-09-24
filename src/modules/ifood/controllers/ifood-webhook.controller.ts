import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { IfoodOrderService } from '../services/ifood-order.service';
import { IfoodClient } from '../ifood.client';
import { TenantResolverService } from '../../tenancy/tenant-resolver.service';

/**
 * Webhook do iFood (multi-tenant).
 * Cada evento traz merchantId — resolvemos o tenant por ele. Como um lote pode
 * (teoricamente) misturar merchants, agrupamos por merchant e processamos cada
 * grupo dentro do contexto RLS do seu tenant.
 */
@Controller('ifood/webhook')
export class IfoodWebhookController {
  private readonly logger = new Logger(IfoodWebhookController.name);

  constructor(
    private readonly orderService: IfoodOrderService,
    private readonly ifoodClient: IfoodClient,
    private readonly tenantResolver: TenantResolverService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  handleWebhook(@Body() body: any) {
    const events = Array.isArray(body) ? body : [body];
    this.process(events).catch((err) =>
      this.logger.error('Erro ao processar eventos iFood', err?.message || err),
    );
    return { received: true };
  }

  private async process(events: any[]): Promise<void> {
    // Agrupa eventos por merchant.
    const byMerchant = new Map<string, any[]>();
    for (const ev of events) {
      const m = ev.merchantId || 'UNKNOWN';
      if (!byMerchant.has(m)) byMerchant.set(m, []);
      byMerchant.get(m)!.push(ev);
    }

    const ingestCodes = new Set(['PLC', 'PLACED', 'CFM', 'CONFIRMED']);

    for (const [merchantId, group] of byMerchant) {
      await this.tenantResolver.runForMerchant(merchantId, async () => {
        for (const ev of group) {
          const code = ev.code || ev.fullCode;
          if (ingestCodes.has(code) && ev.orderId) {
            try {
              await this.orderService.ingestOrder(ev.orderId);
            } catch (e: any) {
              this.logger.error(`Falha ao ingerir pedido ${ev.orderId}`, e?.message || e);
            }
          }
        }
      });
    }

    // Acknowledgment de todos os eventos (fora do contexto de tenant — é chamada externa).
    const ids = events.map((e) => e.id).filter(Boolean);
    try {
      await this.ifoodClient.acknowledgeEvents(ids);
    } catch (e: any) {
      this.logger.error('Falha no acknowledgment', e?.message || e);
    }
  }
}