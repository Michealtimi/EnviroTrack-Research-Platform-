// src/openaq/openaq.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { StationModule } from '../stations/station.module.js';
import { AirQualityModule } from '../air-quality/air-quality.module.js';
import { OpenAQSyncService } from './openaq-sync.service.js';
import { OpenAQService } from './openaq.service.js';
import { OpenAQController } from './openaq.controller.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ApiKeyGuard } from '../common/guards/api-key.guard.js';

@Module({
  imports: [
    HttpModule,
    StationModule, // <-- Import the whole module
    AirQualityModule, // <-- Import the whole module
  ],
  controllers: [OpenAQController],
  providers: [OpenAQSyncService, OpenAQService, PrismaService, ApiKeyGuard],
})
export class OpenAQModule {}