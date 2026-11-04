import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperationalNotice } from './entities/operational-notice.entity';
import { OperationalNoticesService } from './operational-notices.service';
import { OperationalNoticesController } from './operational-notices.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OperationalNotice])],
  controllers: [OperationalNoticesController],
  providers: [OperationalNoticesService],
  exports: [OperationalNoticesService],
})
export class OperationalNoticesModule {}
