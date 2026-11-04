import {
  Controller, Get, Post, Patch, Delete, Param, Body, UseGuards,
} from '@nestjs/common';
import { OperationalNoticesService } from './operational-notices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('operational-notices')
@UseGuards(JwtAuthGuard) // Avisos são configuração da loja — exige JWT.
export class OperationalNoticesController {
  constructor(private readonly service: OperationalNoticesService) {}

  @Get()
  list() {
    return this.service.findAll();
  }

  @Post()
  create(
    @Body()
    body: { message: string; active?: boolean; weekdays?: number[]; start_time?: string | null; end_time?: string | null },
  ) {
    return this.service.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body()
    body: { message?: string; active?: boolean; weekdays?: number[]; start_time?: string | null; end_time?: string | null },
  ) {
    return this.service.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
