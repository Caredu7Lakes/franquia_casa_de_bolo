import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../entities/customer.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
  ) {}

  /** Lista para o dashboard, com telefone/nome MASCARADOS. */
  async findAllMasked(optInOnly = false) {
    const where = optInOnly ? { opt_in_promotions: true } : {};
    const customers = await this.customerRepo.find({
      where,
      order: { created_at: 'DESC' },
    });
    return customers.map((c) => ({
      id: c.id,
      name: this.maskName(c.name),
      phone_number: this.maskPhone(c.phone_number),
      opt_in_promotions: c.opt_in_promotions,
      orders_count: c.orders_count,
      average_ticket: c.average_ticket,
      last_order_at: c.last_order_at,
      tags: c.tags,
      nps_score: c.nps_score,
      created_at: c.created_at,
    }));
  }

  /** Detalhe completo (não mascarado) — só sob ação explícita do dono. */
  async findOneFull(id: string) {
    const c = await this.customerRepo.findOne({
      where: { id },
      relations: ['interactions', 'orders'],
    });
    if (!c) throw new NotFoundException('Cliente não encontrado.');
    return c;
  }

  async update(id: string, data: { tags?: string[]; notes?: string; nps_score?: number }) {
    const c = await this.customerRepo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Cliente não encontrado.');
    if (data.tags !== undefined) c.tags = data.tags;
    if (data.notes !== undefined) c.notes = data.notes;
    if (data.nps_score !== undefined) c.nps_score = data.nps_score;
    return this.customerRepo.save(c);
  }

  private maskPhone(phone: string): string {
    if (!phone || phone.length < 4) return '****';
    return `****${phone.slice(-4)}`;
  }

  private maskName(name: string): string {
    if (!name) return 'Cliente';
    const parts = name.trim().split(' ');
    return parts[0] + (parts.length > 1 ? ' ' + parts[parts.length - 1][0] + '.' : '');
  }
}