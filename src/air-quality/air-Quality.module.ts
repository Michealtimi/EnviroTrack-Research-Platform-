import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AirQualityRepository } from './air-quality.repository.js';
import { StationRepository } from '../stations/station.repository.js';
import { AirQualityController } from './air-quality.controller.js';
import { AirQualityService } from './air-quality.service.js';
import { OpenAQSyncService } from './openaq-sync.service.js'; // 👈 Added for Cron sync

@Module({
  controllers: [AirQualityController],
  providers: [
    PrismaService,
    AirQualityRepository,
    StationRepository,
    AirQualityService,
    OpenAQSyncService, // 👈 Registers Cron service
  ],
  exports: [AirQualityService],
})
export class AirQualityModule {}
