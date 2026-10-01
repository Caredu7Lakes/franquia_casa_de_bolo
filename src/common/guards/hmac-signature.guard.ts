import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Valida a assinatura HMAC-SHA256 do corpo cru da requisição.
 *
 * O remetente deve enviar, no header configurado, o HMAC-SHA256 do corpo exato
 * (bytes crus), usando o segredo compartilhado WEBHOOK_HMAC_SECRET. Aceita o
 * valor com ou sem o prefixo "sha256=". Comparação timing-safe.
 *
 * Fail-safe: sem segredo configurado, recusa a requisição (não deixa o webhook
 * aberto por engano de configuração).
 *
 * Requisito: o app precisa capturar o raw body (NestFactory.create(App,
 * { rawBody: true })) — sem isso não há como recalcular o HMAC dos bytes
 * originais.
 */
@Injectable()
export class HmacSignatureGuard implements CanActivate {
  private readonly logger = new Logger(HmacSignatureGuard.name);
  private readonly secret = process.env.WEBHOOK_HMAC_SECRET || '';
  private readonly header = (process.env.WEBHOOK_HMAC_HEADER || 'x-signature-256').toLowerCase();

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    if (!this.secret) {
      this.logger.error(
        'WEBHOOK_HMAC_SECRET não configurada — webhook recusado (fail-safe).',
      );
      throw new UnauthorizedException('Webhook não configurado.');
    }

    const raw: Buffer | undefined = req.rawBody;
    if (!raw || !raw.length) {
      throw new UnauthorizedException('Corpo ausente para verificação de assinatura.');
    }

    const received = String(req.headers[this.header] || '').trim();
    if (!received) {
      throw new UnauthorizedException('Assinatura ausente.');
    }

    const expected =
      'sha256=' + crypto.createHmac('sha256', this.secret).update(raw).digest('hex');
    const normalized = received.startsWith('sha256=') ? received : `sha256=${received}`;

    const a = Buffer.from(normalized);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Assinatura inválida.');
    }
    return true;
  }
}
