import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { OwnerAnalyticsService } from '../services/owner-analytics.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
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

  @Get('sales-summary')
  getSalesSummary(@Query('days') days?: string) {
    return this.analyticsService.getSalesSummary(days ? Number(days) : 18);
  }

  @Get('sales-by-channel')
  getSalesByChannel(@Query('days') days?: string) {
    return this.analyticsService.getSalesByChannel(days ? Number(days) : 18);
  }

  @Get('customer-retention')
  getCustomerRetention(@Query('days') days?: string) {
    return this.analyticsService.getCustomerRetention(days ? Number(days) : 18);
  }

  @Get('top-products')
  getTopProducts(@Query('days') days?: string) {
    return this.analyticsService.getTopProducts(days ? Number(days) : 18);
  }
}