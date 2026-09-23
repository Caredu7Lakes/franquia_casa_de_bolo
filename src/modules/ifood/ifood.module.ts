import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { Customer } from '../customers/entities/customer.entity';
import { IfoodClient } from './ifood.client';
import { IfoodOrderService } from './services/ifood-order.service';
import { IfoodWebhookController } from './controllers/ifood-webhook.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order, Customer])],
  controllers: [IfoodWebhookController],
  providers: [IfoodClient, IfoodOrderService],
  exports: [IfoodOrderService],
})
export class IfoodModule {}