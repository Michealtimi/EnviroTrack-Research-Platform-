// src/app.module.ts
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { StationModule } from './stations/station.module';
import { AirQualityModule } from './air-quality/air-quality.module';
import { OpenAQModule } from './openaq/openaq.module';

@Module({
  imports: [
    ScheduleModule.forRoot(), // 👈 enables cron jobs
    StationModule,
    AirQualityModule,
    OpenAQModule,
  ],
})
export class AppModule {}
