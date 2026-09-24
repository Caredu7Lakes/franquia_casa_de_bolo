import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { User } from './entities/user.entity';
import { TenantInterceptor } from './interceptors/tenant.interceptor';
import { TenantResolverService } from './tenant-resolver.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, User])],
  providers: [TenantInterceptor, TenantResolverService],
  exports: [TypeOrmModule, TenantInterceptor, TenantResolverService],
})
export class TenancyModule {}