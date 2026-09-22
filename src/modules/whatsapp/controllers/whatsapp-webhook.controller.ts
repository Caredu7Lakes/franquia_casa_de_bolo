import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { WhatsAppBotService } from '../services/whatsapp-bot.service';

/**
 * Webhook da Evolution API v2.
 *
 * A Evolution NÃO usa o formato da Meta (sem hub.verify_token, sem
 * x-hub-signature-256, sem body.object/entry/changes). Ela envia eventos como:
 *   { event: 'messages.upsert', instance: '...', data: { key, message, pushName, ... } }
 *
 * Cada evento de mensagem chega em body.data. Respondemos 200 imediatamente e
 * processamos de forma assíncrona (sem await bloqueante), para a Evolution não
 * reenviar o evento por timeout.
 */
@Controller('webhook')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  constructor(private readonly botService: WhatsAppBotService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  handleWebhook(@Body() body: any) {
    const event = body?.event;

    // Só nos interessa mensagem recebida. Outros eventos (connection.update,
    // messages.update, etc.) são ignorados aqui.
    if (event === 'messages.upsert') {
      // Não damos await: respondemos rápido e processamos em background.
      this.botService.processMessage(body).catch((err) =>
        this.logger.error('Erro ao processar mensagem', err?.message || err),
      );
    }

    return { received: true };
  }
}