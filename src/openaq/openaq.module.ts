// src/openaq/openaq.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OpenAQService } from './openaq.service';
import { StationRepository } from '../stations/station.repository';
import { AirQualityService } from '../air-quality/air-quality.service.js';
import { AirQualityRepository } from '../air-quality/air-quality.repository.js';
import { OpenAQController } from './openaq.controller.js';

@Module({
  imports: [HttpModule],
  controllers: [OpenAQController], // ✅ Added controller
  providers: [
    OpenAQService,
    StationRepository,
    AirQualityService,   // Required by the controller for DB operations
    AirQualityRepository,
  ],
})
export class OpenAQModule {}
