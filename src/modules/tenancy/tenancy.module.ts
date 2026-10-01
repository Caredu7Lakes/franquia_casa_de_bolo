import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { User } from './entities/user.entity';
import { TenantInterceptor } from './interceptors/tenant.interceptor';
import { TenantResolverService } from './tenant-resolver.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, User])],
  providers: [
    TenantInterceptor,
    TenantResolverService,
    // Interceptor GLOBAL: toda rota passa por ele. Onde o JwtAuthGuard setou
    // req.tenantId, abre a transação e roda SET app.current_tenant (contexto
    // RLS); nas demais (webhooks/públicas, sem tenantId) é passthrough.
    // Guards rodam antes dos interceptors, então req.tenantId já está presente.
    { provide: APP_INTERCEPTOR, useExisting: TenantInterceptor },
  ],
  exports: [TypeOrmModule, TenantInterceptor, TenantResolverService],
})
export class TenancyModule {}