import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsAppWebhookController } from './controllers/whatsapp-webhook.controller';
import { WhatsAppBotService } from './services/whatsapp-bot.service';
import { InteractionLog } from './entities/interaction-log.entity';
import { Customer } from '../customers/entities/customer.entity';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([InteractionLog, Customer]),
    // Consome ProductsService via módulo, respeitando a fronteira — não
    // injetamos o ProductRepository de outro módulo diretamente.
    ProductsModule,
  ],
  controllers: [WhatsAppWebhookController],
  providers: [WhatsAppBotService],
  exports: [WhatsAppBotService],
})
export class WhatsAppModule {}