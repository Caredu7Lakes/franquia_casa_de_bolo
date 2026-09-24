import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { DataSource } from 'typeorm';
import { addTransactionalDataSource } from 'typeorm-transactional';

import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import whatsappConfig from './config/whatsapp.config';

import { TenancyModule } from './modules/tenancy/tenancy.module';
import { AuthModule } from './modules/auth/auth.module';
import { WhatsAppModule } from './modules/whatsapp/whatsapp.module';
import { CustomersModule } from './modules/customers/customers.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { MarketingModule } from './modules/marketing/marketing.module';
import { ProductsModule } from './modules/products/products.module';
import { IfoodModule } from './modules/ifood/ifood.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig, whatsappConfig],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        ...configService.get('database'),
      }),
      dataSourceFactory: async (options) => {
        if (!options) throw new Error('Opções do TypeORM ausentes');
        const dataSource = new DataSource(options);
        try {
          return await addTransactionalDataSource(dataSource).initialize();
        } catch {
          return dataSource.initialize();
        }
      },
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
        },
      }),
    }),
    TenancyModule,
    AuthModule,
    WhatsAppModule,
    CustomersModule,
    AnalyticsModule,
    MarketingModule,
    ProductsModule,
    IfoodModule,
  ],
})
export class AppModule {}