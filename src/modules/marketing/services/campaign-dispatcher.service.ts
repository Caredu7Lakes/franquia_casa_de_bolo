import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';

@Injectable()
export class CampaignDispatcherService {
  constructor(
    @InjectQueue('marketing-campaign') private readonly campaignQueue: Queue,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
  ) {}

  async dispatchWeeklyPromotion(couponCode: string, discountPercent: number) {
    const customers = await this.customerRepo.find({ where: { opt_in_promotions: true } });

    for (let index = 0; index < customers.length; index++) {
      const customer = customers[index];
      // Espaça também os envios promocionais (anti-ban): 8s progressivo + jitter.
      const delay = index * 8000 + Math.floor(Math.random() * 3000);

      await this.campaignQueue.add(
        'send-discount-template',
        { phone: customer.phone_number, couponCode, discountPercent },
        { delay, attempts: 3, backoff: { type: 'fixed', delay: 10000 }, removeOnComplete: true },
      );
    }

    return { totalDispatched: customers.length };
  }
}