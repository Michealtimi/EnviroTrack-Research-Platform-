import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { StationRepository } from './station.repository.js';
import { StationService } from './station.service.js';
import { StationController } from './station.controller.js';
import { ApiKeyGuard } from '../common/guards/api-key.guard.js';
import { AuditLogService } from '../common/audit/audit-log.service.js';
import { AirQualityRepository } from '../air-quality/air-quality.repository.js';

@Module({
  controllers: [StationController],
  providers: [PrismaService, StationRepository, StationService, ApiKeyGuard, AuditLogService, AirQualityRepository],
  exports: [StationService],
})
export class StationModule {}
