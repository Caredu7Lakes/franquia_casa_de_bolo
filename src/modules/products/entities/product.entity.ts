import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum ProductCategory {
  BREADS_SAVORIES = 'BREADS_SAVORIES',
  CAKES_SWEETS = 'CAKES_SWEETS',
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 150 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price!: number;

  @Column({ type: 'enum', enum: ProductCategory, default: ProductCategory.CAKES_SWEETS })
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