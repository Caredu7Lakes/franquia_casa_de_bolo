import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InteractionLog } from '../../whatsapp/entities/interaction-log.entity';
import { Customer } from '../../customers/entities/customer.entity';

@Injectable()
export class OwnerAnalyticsService {
  constructor(
    @InjectRepository(InteractionLog) private logRepo: Repository<InteractionLog>,
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
  ) {}

  async getMostFrequentQuestions() {
    // Agrupa por menuOption (campo real da entidade). O antigo 'intent_detected'
    // não existe e quebrava em runtime.
    return this.logRepo
      .createQueryBuilder('log')
      .select('log.menuOption', 'menu_option')
      .addSelect('COUNT(log.id)', 'total_requests')
      .where('log.menuOption IS NOT NULL')
      .groupBy('log.menuOption')
      .orderBy('total_requests', 'DESC')
      .getRawMany();
  }

  async getPeakHoursAndDays() {
    return this.logRepo
      .createQueryBuilder('log')
      .select("TO_CHAR(log.created_at, 'Day')", 'day_of_week')
      .addSelect('EXTRACT(HOUR FROM log.created_at)', 'hour_of_day')
      .addSelect('COUNT(log.id)', 'interaction_count')
      .groupBy('day_of_week, hour_of_day')
      .orderBy('interaction_count', 'DESC')
      .getRawMany();
  }

  async getOptedInCustomers() {
    return this.customerRepo.find({ where: { opt_in_promotions: true } });
  }
}