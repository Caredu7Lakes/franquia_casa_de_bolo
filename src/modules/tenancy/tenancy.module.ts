import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './entities/tenant.entity';
import { User } from './entities/user.entity';
import { TenantInterceptor } from './interceptors/tenant.interceptor';

@Module({
  imports: [TypeOrmModule.forFeature([Tenant, User])],
  providers: [TenantInterceptor],
  exports: [TypeOrmModule, TenantInterceptor],
})
export class TenancyModule {}