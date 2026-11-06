import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsappEncomenda, EncomendaStatus } from '../entities/whatsapp-encomenda.entity';

/**
 * Leitura/gestao das encomendas coletadas pelo bot — consumida pelo painel do
 * dono (repasse -> confirmacao humana). Toda query roda no contexto RLS do
 * tenant resolvido pelo JWT da requisicao.
 */
@Injectable()
export class EncomendasService {
  constructor(
    @InjectRepository(WhatsappEncomenda) private readonly repo: Repository<WhatsappEncomenda>,
  ) {}

  async list(status?: EncomendaStatus) {
    const where = status ? { status } : {};
    return this.repo.find({
      where,
      relations: ['customer'],
      order: { created_at: 'DESC' },
    });
  }

  async setStatus(id: string, status: EncomendaStatus) {
    const enc = await this.repo.findOne({ where: { id } });
    if (!enc) throw new NotFoundException('Encomenda não encontrada.');
    enc.status = status;
    return this.repo.save(enc);
  }
}
