import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AirQualityService } from './air-quality.service.js';
import fetch from 'node-fetch';

@Injectable()
export class OpenAQSyncService {
  private readonly logger = new Logger(OpenAQSyncService.name);

  constructor(private readonly airQualityService: AirQualityService) {}

  // Cron job runs every hour (can adjust)
  @Cron(CronExpression.EVERY_HOUR)
  async handleOpenAQSync() {
    this.logger.log('Starting OpenAQ sync via Cron job...');

    try {
      // 1️⃣ Fetch parameters from OpenAQ API
      const paramResponse = await fetch('https://api.openaq.org/v2/parameters');
      const paramData = await paramResponse.json();
      const parameters = paramData.results.map((p: any) => ({
        id: p.id,
        name: p.name,
        displayName: p.displayName,
        units: p.unit,
        description: p.description,
      }));

      // 2️⃣ Fetch latest measurements from OpenAQ API
      const measurementResponse = await fetch('https://api.openaq.org/v2/latest?limit=10000');
      const measurementData = await measurementResponse.json();

      const measurements: {
        stationId: number;
        parameterId: number;
        value: number;
        dateUtc: string;
      }[] = [];

      // Map OpenAQ stations to your local Station table
      for (const record of measurementData.results) {
        const station = await this.airQualityService['stationRepo'].findByNameAndCity(
          record.location,
          record.city,
        );

        if (!station) continue;

        for (const m of record.measurements) {
          measurements.push({
            stationId: station.id,
            parameterId: m.parameterId, // Assumes OpenAQ parameter IDs match your DB
            value: m.value,
            dateUtc: m.lastUpdated,
          });
        }
      }

      // 3️⃣ Perform full sync
      await this.airQualityService.fullOpenAQSync({ parameters, measurements });

      this.logger.log('OpenAQ sync completed successfully.');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`OpenAQ sync failed. Error: ${errorMessage}`);
    }
  }
}
