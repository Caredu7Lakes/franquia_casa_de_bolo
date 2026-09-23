import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';

import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import whatsappConfig from './config/whatsapp.config';

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
      useFactory: (configService: ConfigService) => ({
        ...configService.get('database'),
      }),
      inject: [ConfigService],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('redis.host'),
          port: configService.get('redis.port'),
        },
      }),
      inject: [ConfigService],
    }),
    WhatsAppModule,
    CustomersModule,
    AnalyticsModule,
    MarketingModule,
    ProductsModule,
    IfoodModule,
  ],
})
export class AppModule {}