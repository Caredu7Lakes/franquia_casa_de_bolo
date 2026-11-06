import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';

export type EncomendaStatus = 'pending' | 'confirmed' | 'cancelled';

/**
 * Encomenda coletada pelo bot no WhatsApp. A equipe valida disponibilidade e
 * preco e confirma manualmente (reserva = 50% de sinal via Pix). Guarda PII
 * (customer_name + vinculo customer_id) -> coberta por export/anonimizacao.
 */
@Entity('whatsapp_encomendas')
@Index(['tenant_id'])
export class WhatsappEncomenda {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  // Titular. SET NULL na anonimizacao (LGPD) — some o vinculo, mantem o
  // registro operacional (sabor/data) para a equipe.
  @ManyToOne(() => Customer, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer | null;

  // Nome informado no fluxo (PII) — zerado na anonimizacao.
  @Column({ type: 'varchar', length: 250, nullable: true })
  customer_name!: string | null;

  // Sabor e texto livre: quem valida preco/disponibilidade e a equipe.
  @Column({ type: 'varchar', length: 250 })
  flavor!: string;

  // Retirada validada pelo bot (nunca string arbitraria).
  @Column({ type: 'date' })
  pickup_date!: string; // yyyy-mm-dd

  @Column({ type: 'varchar', length: 5 })
  pickup_time!: string; // HH:mm

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status!: EncomendaStatus;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at!: Date;
}
