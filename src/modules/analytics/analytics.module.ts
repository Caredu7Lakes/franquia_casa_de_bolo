import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OwnerAnalyticsController } from './controllers/owner-analytics.controller';
import { OwnerAnalyticsService } from './services/owner-analytics.service';
import { InteractionLog } from '../whatsapp/entities/interaction-log.entity';
import { Customer } from '../customers/entities/customer.entity';
import { Order } from '../ifood/entities/order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([InteractionLog, Customer, Order])],
  controllers: [OwnerAnalyticsController],
  providers: [OwnerAnalyticsService],
})
export class AnalyticsModule {}