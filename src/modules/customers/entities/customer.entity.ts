import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index,
} from 'typeorm';
import { InteractionLog } from '../../whatsapp/entities/interaction-log.entity';
import { Order } from '../../ifood/entities/order.entity';

@Entity('customers')
// Telefone único POR TENANT (não global) — dois tenants podem ter o mesmo cliente.
@Index(['tenant_id', 'phone_number'], { unique: true })
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column({ length: 20 })
  phone_number!: string;

  @Column({ nullable: true, length: 250 })
  name!: string;

  @Column({ nullable: true, length: 250 })
  email!: string;

  @Column({ type: 'text', nullable: true })
  delivery_address!: string;

  @Column({ default: false })
  opt_in_promotions!: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  opt_in_updated_at!: Date;

  @Column({ type: 'text', array: true, default: () => "'{}'" })
  tags!: string[];

  @Column({ type: 'text', nullable: true })
  notes!: string;

  @Column({ type: 'smallint', nullable: true })
  nps_score!: number;

  @Column({ type: 'int', default: 0 })
  orders_count!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  total_spent!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  average_ticket!: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  last_order_at!: Date;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at!: Date;

  @OneToMany(() => InteractionLog, (log) => log.customer)
  interactions!: InteractionLog[];

  @OneToMany(() => Order, (order) => order.customer)
  orders!: Order[];
}