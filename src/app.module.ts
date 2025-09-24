// src/app.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { StationModule } from './stations/station.module.js';
import { AirQualityModule } from './air-quality/air-quality.module.js';
import { OpenAQModule } from './openaq/openaq.module.js';

@Module({
  imports: [
    ScheduleModule.forRoot(), // 👈 enables cron jobs
    StationModule,
    AirQualityModule,
    OpenAQModule,
  ],
})
export class AppModule {}
