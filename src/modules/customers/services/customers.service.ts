import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Customer } from '../entities/customer.entity';

@Injectable()
export class CustomersService {
  constructor(
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
  ) {}

  /** Lista para o dashboard, com telefone/nome MASCARADOS. Oculta anonimizados. */
  async findAllMasked(optInOnly = false) {
    const where: any = { anonymized_at: IsNull() };
    if (optInOnly) where.opt_in_promotions = true;
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

  /** Direito de acesso (LGPD art. 18, II): pacote completo dos dados do titular. */
  async exportData(id: string) {
    const c = await this.customerRepo.findOne({
      where: { id },
      relations: ['interactions', 'orders'],
    });
    if (!c) throw new NotFoundException('Cliente não encontrado.');

    // Encomendas do WhatsApp (tabela nova com PII) tambem entram no pacote.
    const encomendas = await this.customerRepo.manager.query(
      `SELECT id, customer_name, flavor, pickup_date, pickup_time, status, created_at
         FROM whatsapp_encomendas WHERE customer_id = $1 ORDER BY created_at DESC`,
      [id],
    );

    return { exported_at: new Date().toISOString(), customer: c, encomendas };
  }

  /**
   * Direito de exclusão (LGPD art. 18, VI) por ANONIMIZAÇÃO.
   * Remove a PII do titular; preserva histórico agregado (orders) para fins
   * fiscais/contábeis. Idempotente. Roda na transação RLS da requisição.
   */
  async anonymize(id: string) {
    const c = await this.customerRepo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Cliente não encontrado.');
    if (c.anonymized_at) {
      return { id, status: 'already_anonymized', anonymized_at: c.anonymized_at };
    }

    const m = this.customerRepo.manager; // manager transacional: RLS + atômico

    // 1. Logs: zera o texto livre do cliente (PII); mantém menuOption/created_at.
    await m.query(`UPDATE interaction_logs SET "userMessage" = NULL WHERE customer_id = $1`, [id]);
    // 2. Pedidos: desvincula do titular; mantém total/canal/data p/ contabilidade.
    await m.query(`UPDATE orders SET customer_id = NULL WHERE customer_id = $1`, [id]);
    // 3. Encomendas do WhatsApp: remove o nome (PII) e desvincula; mantém
    //    sabor/data/status como registro operacional sem titular.
    await m.query(
      `UPDATE whatsapp_encomendas SET customer_name = NULL, customer_id = NULL WHERE customer_id = $1`,
      [id],
    );

    // 4. Cadastro: remove PII. phone_number é NOT NULL + único/tenant -> placeholder.
    c.phone_number = `ANON-${id.replace(/-/g, '').slice(0, 24)}`;
    c.name = null as any;
    c.email = null as any;
    c.delivery_address = null as any;
    c.notes = null as any;
    c.tags = [];
    c.nps_score = null as any;
    c.opt_in_promotions = false;
    c.opt_in_updated_at = new Date();
    c.anonymized_at = new Date();
    await this.customerRepo.save(c);

    return { id, status: 'anonymized', anonymized_at: c.anonymized_at };
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
