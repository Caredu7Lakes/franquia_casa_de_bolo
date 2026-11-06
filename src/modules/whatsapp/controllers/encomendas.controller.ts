import { Controller, Get, Patch, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { EncomendasService } from '../services/encomendas.service';
import { EncomendaStatus } from '../entities/whatsapp-encomenda.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

const VALID: EncomendaStatus[] = ['pending', 'confirmed', 'cancelled'];

/**
 * Encomendas do WhatsApp para o painel. Exige JWT (dados do cliente). O tenant
 * vem do token -> RLS isola automaticamente.
 */
@Controller('encomendas')
@UseGuards(JwtAuthGuard)
export class EncomendasController {
  constructor(private readonly encomendas: EncomendasService) {}

  @Get()
  list(@Query('status') status?: string) {
    if (status && !VALID.includes(status as EncomendaStatus)) {
      throw new BadRequestException(`status inválido. Use: ${VALID.join(', ')}.`);
    }
    return this.encomendas.list(status as EncomendaStatus | undefined);
  }

  @Patch(':id/confirm')
  confirm(@Param('id') id: string) {
    return this.encomendas.setStatus(id, 'confirmed');
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.encomendas.setStatus(id, 'cancelled');
  }
}
