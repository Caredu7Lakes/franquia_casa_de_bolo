import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CampaignProcessor } from './processors/promotional-campaign.processor';
import { CampaignDispatcherService } from './services/campaign-dispatcher.service';
import { BulkDispatchProcessor } from './processors/bulk-dispatch.processor';
import { BulkDispatchService } from './services/bulk-dispatch.service';
import { MarketingController } from './controllers/marketing.controller';
import { Customer } from '../customers/entities/customer.entity';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'marketing-campaign' }, { name: 'bulk-dispatch' }),
    TypeOrmModule.forFeature([Customer]),
  ],
  controllers: [MarketingController],
  providers: [
    CampaignProcessor,
    CampaignDispatcherService,
    BulkDispatchProcessor,
    BulkDispatchService,
  ],
  exports: [CampaignDispatcherService, BulkDispatchService],
})
export class MarketingModule {}