// src/openaq/openaq.module.ts
import { Module } from '@nestjs/common';
import { StationRepository } from '../stations/station.repository';
import { AirQualityService } from '../air-quality/air-quality.service.js';
import { AirQualityRepository } from '../air-quality/air-quality.repository.js';
import { OpenAQSyncService } from './openaq-sync.service.js'; // The cron service
import { OpenAQService } from './openaq.service.js'; // The API-driven service
import { OpenAQController } from './openaq.controller.js'; // The controller for the API
import { StationService } from '../stations/station.service.js';

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
  ],
})
export class OpenAQModule {}
