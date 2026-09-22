import {
  Controller,
  Post,
  Get,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ProductsService } from './products.service';
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

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          // Gera um nome único para o arquivo usando timestamp e caracteres aleatórios
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          const ext = extname(file.originalname);
          callback(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
          return callback(new BadRequestException('Apenas arquivos de imagem são permitidos!'), false);
        }
        callback(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB por imagem
    }),
  )
  async createProduct(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: { name: string; description: string; price: number },
  ) {
    if (!file) {
      throw new BadRequestException('A foto do produto é obrigatória.');
    }

    // Constrói a URL pública da imagem enviada
    const imageUrl = `${process.env.SERVER_URL || 'http://localhost:3000'}/uploads/${file.filename}`;

    return this.productsService.create({
      name: body.name,
      description: body.description,
      price: body.price,
      imageUrl: imageUrl,
    });
  }

  @Get()
  async listProducts() {
    return this.productsService.findAll();
  }
}