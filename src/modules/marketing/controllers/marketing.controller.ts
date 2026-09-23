import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { BulkDispatchService } from '../services/bulk-dispatch.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('marketing')
@UseGuards(JwtAuthGuard) // Disparo em massa exige JWT.
export class MarketingController {
  constructor(private readonly bulkDispatch: BulkDispatchService) {}

  /** Dispara uma campanha para a base (ou só opt-in). */
  @Post('campaign')
  startCampaign(
    @Body()
    body: {
      messageText?: string;
      mediaUrl?: string;
      onlyOptIn?: boolean;
      delayBetweenMessagesMs?: number;
    },
  ) {
    return this.bulkDispatch.startCampaign({
      messageText: body.messageText,
      mediaUrl: body.mediaUrl,
      onlyOptIn: body.onlyOptIn ?? true, // por padrão, só quem deu opt-in (LGPD)
      delayBetweenMessagesMs: body.delayBetweenMessagesMs,
    });
  }
}