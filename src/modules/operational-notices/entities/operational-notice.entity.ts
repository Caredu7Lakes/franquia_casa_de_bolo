import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

@Entity('operational_notices')
@Index(['tenant_id'])
export class OperationalNotice {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column({ type: 'text' })
  message!: string;

  // Interruptor mestre: só avisos ativos entram no fluxo do bot.
  @Column({ default: false })
  active!: boolean;

  // Dias da semana em que o aviso vale (0=Dom … 6=Sáb). Vazio = todos os dias.
  @Column({ type: 'integer', array: true, default: () => "'{}'" })
  weekdays!: number[];

  // Janela de horário "HH:MM" (fuso America/Sao_Paulo). Null = dia todo.
  @Column({ type: 'varchar', length: 5, nullable: true })
  start_time!: string | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  end_time!: string | null;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at!: Date;
}
