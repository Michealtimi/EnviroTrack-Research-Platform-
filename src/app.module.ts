// src/app.module.ts
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { StationModule } from './stations/station.module.js';
import { AirQualityModule } from './air-quality/air-quality.module.js';
import { OpenAQModule } from './openaq/openaq.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(), // 👈 enables cron jobs
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]), // 100 req/min per IP, applied globally below
    StationModule,
    AirQualityModule,
    OpenAQModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
