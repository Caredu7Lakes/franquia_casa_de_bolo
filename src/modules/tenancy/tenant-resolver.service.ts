import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DataSource } from 'typeorm';
import { runInTransaction } from 'typeorm-transactional';
import { Tenant } from './entities/tenant.entity';

/**
 * Resolve o tenant a partir de um identificador de canal (instância Evolution
 * ou merchant iFood) e executa o processamento DENTRO de uma transação com o
 * app.current_tenant setado — o mesmo mecanismo RLS do dashboard, mas para os
 * webhooks, que não têm JWT.
 */
@Injectable()
export class TenantResolverService {
  private readonly logger = new Logger(TenantResolverService.name);

  constructor(
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
    private readonly dataSource: DataSource,
  ) {}

  /** Resolve pelo nome da instância Evolution. */
  async runForInstance<T>(instance: string, work: () => Promise<T>): Promise<T | void> {
    const tenant = await this.tenantRepo.findOne({ where: { evolution_instance: instance, active: true } });
    if (!tenant) {
      this.logger.warn(`Instância sem tenant: ${instance}`);
      return;
    }
    return this.runWithTenant(tenant.id, work);
  }

  /** Resolve pelo merchant do iFood. */
  async runForMerchant<T>(merchantId: string, work: () => Promise<T>): Promise<T | void> {
    const tenant = await this.tenantRepo.findOne({ where: { ifood_merchant_id: merchantId, active: true } });
    if (!tenant) {
      this.logger.warn(`Merchant iFood sem tenant: ${merchantId}`);
      return;
    }
    return this.runWithTenant(tenant.id, work);
  }

  /** Abre transação, seta o tenant (RLS) e roda o trabalho. */
  private async runWithTenant<T>(tenantId: string, work: () => Promise<T>): Promise<T> {
    return runInTransaction(async () => {
      await this.dataSource.query(`SELECT set_config('app.current_tenant', $1, true)`, [tenantId]);
      return work();
    });
  }
}