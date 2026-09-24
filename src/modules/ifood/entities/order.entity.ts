import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';

@Entity('orders')
@Index(['tenant_id'])
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  // ID do pedido no iFood, único por tenant (cada loja tem sua numeração).
  @Column()
  ifood_order_id!: string;

  @Column({ nullable: true })
  display_id!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  total!: number;

  @Column({ type: 'jsonb', nullable: true })
  items!: any;

  @Column({ nullable: true })
  status!: string;

  @Column({ nullable: true })
  sales_channel!: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  ordered_at!: Date;

  @ManyToOne(() => Customer, (customer) => customer.orders, { nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at!: Date;
}