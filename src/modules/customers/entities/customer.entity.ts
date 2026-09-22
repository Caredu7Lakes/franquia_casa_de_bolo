import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { InteractionLog } from '../../whatsapp/entities/interaction-log.entity';

@Entity('customers')
export class Customer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true, length: 20 })
  phone_number!: string;

  @Column({ nullable: true, length: 250 })
  name!: string;

  @Column({ default: false })
  opt_in_promotions!: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  opt_in_updated_at!: Date;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at!: Date;

  @OneToMany(() => InteractionLog, (log) => log.customer)
  interactions!: InteractionLog[];
}