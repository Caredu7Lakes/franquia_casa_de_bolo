import { Controller, Get, UseGuards } from '@nestjs/common';
import { OwnerAnalyticsService } from '../services/owner-analytics.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard) // Todas as rotas de analytics exigem JWT.
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