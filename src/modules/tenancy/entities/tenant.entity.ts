import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 200 })
  name!: string;

  @Column({ default: true })
  active!: boolean;

  // Identifica o tenant no webhook da Evolution (nome da instância).
  @Column({ unique: true, nullable: true })
  evolution_instance!: string;

  // Identifica o tenant no webhook do iFood (merchant/loja).
  @Column({ unique: true, nullable: true })
  ifood_merchant_id!: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at!: Date;
}