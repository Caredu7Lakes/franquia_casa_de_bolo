import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product, ProductCategory } from './entities/product.entity';
import { TenantResolverService } from '../tenancy/tenant-resolver.service';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly tenantResolver: TenantResolverService,
  ) {}

  async create(data: Partial<Product>): Promise<Product> {
    const product = this.productRepo.create(data);
    return this.productRepo.save(product);
  }

  // Rota pública (cardápio do bot + painel): resolve o tenant da loja pela
  // instância Evolution e lista sob o contexto RLS. Loja única hoje.
  async findAll(): Promise<Product[]> {
    const instance = process.env.EVOLUTION_INSTANCE_NAME || 'casa_do_bolo_instance';
    const result = await this.tenantResolver.runForInstance(instance, () =>
      this.productRepo.find(),
    );
    return result || [];
  }

  async findAvailableByCategory(category: ProductCategory): Promise<Product[]> {
    return this.productRepo.find({ where: { available: true, category } });
  }

  async update(id: string, data: Partial<Product>): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { id } });
    if (!product) throw new NotFoundException('Produto não encontrado.');
    Object.assign(product, data);
    return this.productRepo.save(product);
  }
}