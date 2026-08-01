import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AirQualityRepository } from './air-quality.repository.js';
import { StationRepository } from '../stations/station.repository.js';
import { AirQualityController } from './air-quality.controller.js';
import { AirQualityService } from './air-quality.service.js';
import { AuditLogService } from '../common/audit/audit-log.service.js';

@Module({
  controllers: [AirQualityController],
  providers: [
    PrismaService,
    AirQualityRepository,
    StationRepository,
    AirQualityService,
    AuditLogService,
  ],
  exports: [AirQualityService],
})
export class AirQualityModule {}
