import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { WhatsAppBotService } from '../services/whatsapp-bot.service';
import { TenantResolverService } from '../../tenancy/tenant-resolver.service';

/**
 * Webhook da Evolution API v2 (multi-tenant).
 * O payload traz body.instance — é por ele que resolvemos o tenant. Todo o
 * processamento roda DENTRO do contexto RLS daquele tenant.
 */
@Controller('webhook')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(
    private readonly botService: WhatsAppBotService,
    private readonly tenantResolver: TenantResolverService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  handleWebhook(@Body() body: any) {
    if (body?.event === 'messages.upsert') {
      const instance: string = body?.instance;
      // Resolve o tenant pela instância e processa dentro do contexto RLS.
      this.tenantResolver
        .runForInstance(instance, () => this.botService.processMessage(body))
        .catch((err) => this.logger.error('Erro ao processar mensagem', err?.message || err));
    }
    return { received: true };
  }
}