// src/openaq/openaq.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { StationModule } from '../stations/station.module.js';
import { AirQualityModule } from '../air-quality/air-quality.module.js';
import { OpenAQSyncService } from './openaq-sync.service.js';
import { OpenAQService } from './openaq.service.js';
import { OpenAQController } from './openaq.controller.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    StationModule, // <-- Import the whole module
    AirQualityModule, // <-- Import the whole module
  ],
  controllers: [OpenAQController],
  providers: [OpenAQSyncService, OpenAQService, PrismaService],
})
export class OpenAQModule {}