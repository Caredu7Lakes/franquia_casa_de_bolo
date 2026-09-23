import { Controller, Get, Patch, Param, Query, Body, UseGuards } from '@nestjs/common';
import { CustomersService } from '../services/customers.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@Controller('customers')
@UseGuards(JwtAuthGuard) // CRM inteiro exige JWT — dados sensíveis.
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  list(@Query('optIn') optIn?: string) {
    return this.customersService.findAllMasked(optIn === 'true');
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.customersService.findOneFull(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: { tags?: string[]; notes?: string; nps_score?: number },
  ) {
    return this.customersService.update(id, body);
  }
}