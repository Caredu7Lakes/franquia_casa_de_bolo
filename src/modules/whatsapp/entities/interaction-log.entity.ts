import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';

@Entity('interaction_logs')
export class InteractionLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ nullable: true })
  menuOption!: string; // Ex: '1.1', '1.2', '2.1', 'DUVIDAS'

  @Column({ type: 'text', nullable: true })
  userMessage!: string;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer!: Customer;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at!: Date;
}