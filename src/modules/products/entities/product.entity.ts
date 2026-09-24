import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';

export enum ProductCategory {
  BOLOS = 'BOLOS',
  MINI_BABY = 'MINI_BABY',
  BITES = 'BITES',
  RECHEADOS = 'RECHEADOS',
  CASEIRO_POTE = 'CASEIRO_POTE',
  GELADOS = 'GELADOS',
  CUCAS_TORTAS = 'CUCAS_TORTAS',
  COBERTURAS = 'COBERTURAS',
  ESPECIAIS = 'ESPECIAIS',
  ACESSORIOS = 'ACESSORIOS',
}

@Entity('products')
@Index(['tenant_id'])
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column('uuid')
  tenant_id!: string;

  @Column({ length: 150 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  price!: number;

  @Column({ type: 'enum', enum: ProductCategory, default: ProductCategory.BOLOS })
  category!: ProductCategory;

  @Column({ nullable: true })
  imageUrl!: string;

  @Column({ default: true })
  available!: boolean;

  @CreateDateColumn()
  created_at!: Date;

  @UpdateDateColumn()
  updated_at!: Date;
}