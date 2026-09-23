import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // ID do pedido no iFood (idempotência: não gravar o mesmo pedido 2x).
  @Column({ unique: true })
  ifood_order_id!: string;

  @Column({ nullable: true })
  display_id!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  total!: number;

  // Itens do pedido, como vieram do iFood (nome, quantidade, preço).
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