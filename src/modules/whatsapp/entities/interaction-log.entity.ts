import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn, Index,
} from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';

@Entity('interaction_logs')
@Index(['tenant_id'])
export class InteractionLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column({ nullable: true })
  menuOption!: string;

  @Column({ type: 'text', nullable: true })
  userMessage!: string;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at!: Date;
}