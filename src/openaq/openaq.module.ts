// src/openaq/openaq.module.ts
import { Module } from '@nestjs/common';
import { StationRepository } from '../stations/station.repository';
import { AirQualityService } from '../air-quality/air-quality.service.js';
import { AirQualityRepository } from '../air-quality/air-quality.repository.js';
import { OpenAQSyncService } from './openaq-sync.service.js';
import { OpenAQService } from './openaq.service.js';
import { OpenAQController } from './openaq.controller.js';
import { StationService } from '../stations/station.service.js';
import { PrismaService } from '../prisma/prisma.service.js'; // <-- ADD THIS IMPORT

@Module({
  imports: [],
  controllers: [OpenAQController],
  providers: [
    OpenAQSyncService,
    OpenAQService,
    StationService,
    StationRepository,
    AirQualityService,
    AirQualityRepository,
    PrismaService, // <-- ADD THIS PROVIDER
  ],
})
export class OpenAQModule {}