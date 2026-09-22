import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from '../../customers/entities/customer.entity';

@Injectable()
export class BulkDispatchService {
  constructor(
    @InjectQueue('bulk-dispatch') private readonly dispatchQueue: Queue,
    @InjectRepository(Customer) private readonly customerRepo: Repository<Customer>,
  ) {}

  async startCampaign(options: {
    messageText?: string;
    mediaUrl?: string;
    onlyOptIn?: boolean;
    delayBetweenMessagesMs?: number;
  }) {
    const whereClause = options.onlyOptIn ? { opt_in_promotions: true } : {};
    const customers = await this.customerRepo.find({ where: whereClause });

    const baseDelay = options.delayBetweenMessagesMs || 8000;

    for (let index = 0; index < customers.length; index++) {
      const customer = customers[index];

      // Delay progressivo + jitter para espaçar os envios (anti-ban).
      const jitter = Math.floor(Math.random() * 3000);
      const calculatedDelay = index * baseDelay + jitter;

      await this.dispatchQueue.add(
        'send-whatsapp-message',
        {
          phone: customer.phone_number,
          messageText: options.messageText,
          mediaUrl: options.mediaUrl,
        },
        {
          delay: calculatedDelay,
          attempts: 3,
          // BullMQ: backoff é objeto { type, delay }, não número.
          backoff: { type: 'fixed', delay: 10000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );
    }

    return {
      status: 'queued',
      totalContacts: customers.length,
      estimatedTimeMinutes: Math.ceil((customers.length * baseDelay) / 1000 / 60),
    };
  }
}