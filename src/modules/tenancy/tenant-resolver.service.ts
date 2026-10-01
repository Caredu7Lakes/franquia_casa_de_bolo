import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { runInTransaction } from 'typeorm-transactional';
import { Tenant } from './entities/tenant.entity';

/**
 * Resolve o tenant (instância Evolution ou merchant iFood) e executa o trabalho
 * dentro de uma transação com app.current_tenant setado — contexto RLS para os
 * webhooks, que não têm JWT.
 */
@Injectable()
export class TenantResolverService {
  private readonly logger = new Logger(TenantResolverService.name);

  constructor(
    @InjectRepository(Tenant) private readonly tenantRepo: Repository<Tenant>,
  ) {}

  async runForInstance<T>(instance: string, work: () => Promise<T>): Promise<T | void> {
    const tenant = await this.tenantRepo.findOne({ where: { evolution_instance: instance, active: true } });
    if (!tenant) {
      this.logger.warn(`Instância sem tenant: ${instance}`);
      return;
    }
    return this.runWithTenant(tenant.id, work);
  }

  async runForMerchant<T>(merchantId: string, work: () => Promise<T>): Promise<T | void> {
    const tenant = await this.tenantRepo.findOne({ where: { ifood_merchant_id: merchantId, active: true } });
    if (!tenant) {
      this.logger.warn(`Merchant iFood sem tenant: ${merchantId}`);
      return;
    }
    return this.runWithTenant(tenant.id, work);
  }

  /**
   * Abre a transação e seta o tenant na conexão DELA.
   *
   * Chave do RLS: usamos tenantRepo.manager.query (não dataSource.query). Dentro
   * de runInTransaction, o typeorm-transactional substitui o manager dos
   * repositórios injetados pelo manager da transação corrente (via async local
   * storage). Assim o SET e os inserts do work() usam a MESMA conexão — sem
   * isso, o SET iria para outra conexão do pool e o RLS bloquearia.
   */
  private async runWithTenant<T>(tenantId: string, work: () => Promise<T>): Promise<T> {
    return runInTransaction(async () => {
      await this.tenantRepo.manager.query(
        `SELECT set_config('app.current_tenant', $1, true)`,
        [tenantId],
      );
      return work();
    });
  }
}