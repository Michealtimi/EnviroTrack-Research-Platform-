// src/app.module.ts
import { Module } from '@nestjs/common';

import { StationModule } from './stations/station.module.js';
import { AirQualityModule } from './air-quality/air-quality.module.js';
; // FIX: Changed 'air-Quality.module' to 'air-quality.module'

@Module({
  imports: [StationModule, AirQualityModule],
})
export class AppModule {}