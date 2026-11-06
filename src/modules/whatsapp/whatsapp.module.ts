import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WhatsAppWebhookController } from './controllers/whatsapp-webhook.controller';
import { EncomendasController } from './controllers/encomendas.controller';
import { WhatsAppBotService } from './services/whatsapp-bot.service';
import { EncomendasService } from './services/encomendas.service';
import { InteractionLog } from './entities/interaction-log.entity';
import { WhatsappEncomenda } from './entities/whatsapp-encomenda.entity';
import { Customer } from '../customers/entities/customer.entity';
import { ProductsModule } from '../products/products.module';
import { TenancyModule } from '../tenancy/tenancy.module';
import { OperationalNoticesModule } from '../operational-notices/operational-notices.module';
import { RedisProvider } from './session/redis.provider';
import { BotSessionService } from './session/bot-session.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([InteractionLog, Customer, WhatsappEncomenda]),
    ProductsModule,
    TenancyModule, // fornece o TenantResolverService ao webhook.
    OperationalNoticesModule, // avisos operacionais exibidos pelo bot.
  ],
  controllers: [WhatsAppWebhookController, EncomendasController],
  providers: [WhatsAppBotService, EncomendasService, RedisProvider, BotSessionService],
  exports: [WhatsAppBotService],
})
export class WhatsAppModule {}
