import { Controller, Get } from '@nestjs/common';
import { OwnerAnalyticsService } from '../services/owner-analytics.service';

@Controller('analytics')
export class OwnerAnalyticsController {
  constructor(private readonly analyticsService: OwnerAnalyticsService) {}

  @Get('frequent-questions')
  getMostFrequentQuestions() {
    return this.analyticsService.getMostFrequentQuestions();
  }

  @Get('peak-hours')
  getPeakHours() {
    return this.analyticsService.getPeakHoursAndDays();
  }

  @Get('opted-in-customers')
  getOptedInCustomers() {
    return this.analyticsService.getOptedInCustomers();
  }
}