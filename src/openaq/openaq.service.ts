// src/openaq/openaq.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule'; // For scheduling cron jobs
import axios from 'axios'; // HTTP client for calling OpenAQ API
import { StationRepository } from '../stations/station.repository.js';
import { AirQualityService } from '../air-quality/air-quality.service.js';

@Injectable()
export class OpenAQService {
  private readonly logger = new Logger(OpenAQService.name);
  private readonly baseUrl = 'https://api.openaq.org/v3'; // OpenAQ v3 API

  constructor(
    private readonly stationRepo: StationRepository, // Existing repository
    private readonly airQualityService: AirQualityService, // Existing service
  ) {}

  /* -----------------------------
     🔹 Stage 1: Sync Stations
  ----------------------------- */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT) // Runs daily at midnight
  async syncStations() {
    this.logger.log('🔄 Starting OpenAQ stations sync...');

    try {
      let page = 1;
      let totalResults = 0;

      while (true) {
        const res = await axios.get(`${this.baseUrl}/locations`, {
          params: { page, limit: 100 }, // pagination
        });

        const stations = res.data.results;
        if (!stations || stations.length === 0) break; // stop when no more data

        for (const s of stations) {
          await this.stationRepo.upsertFromOpenAQ({
            openaqStationId: s.id.toString(),
            name: s.name,
            city: s.city ?? 'Unknown',
            country: s.country ?? 'Unknown',
            latitude: s.coordinates?.latitude ?? 0,
            longitude: s.coordinates?.longitude ?? 0,
          });
          totalResults++;
        }

        page++;
      }

      this.logger.log(`✅ OpenAQ stations sync completed. Total stations synced: ${totalResults}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ OpenAQ stations sync failed. Error: ${msg}`);
    }
  }

  /* -----------------------------
     🔹 Stage 2: Sync Parameters
  ----------------------------- */
  @Cron(CronExpression.EVERY_DAY_AT_1AM) // Run after stations sync
  async syncParameters() {
    this.logger.log('🔄 Starting OpenAQ parameters sync...');

    try {
      const res = await axios.get(`${this.baseUrl}/parameters`);
      const parameters = res.data.results;

      // Loop through each parameter
      for (const p of parameters) {
        await this.airQualityService.upsertParameter({
          id: p.id,
          name: p.name,
          displayName: p.displayName,
          units: p.units,
          description: p.description ?? '',
        });
      }

      this.logger.log(`✅ OpenAQ parameters sync completed. Total parameters: ${parameters.length}`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ OpenAQ parameters sync failed. Error: ${msg}`);
    }
  }

  /* -----------------------------
     🔹 Stage 3: Sync Measurements
  ----------------------------- */
  @Cron(CronExpression.EVERY_30_MINUTES) // Frequent sync for latest measurements
  async syncMeasurements() {
    this.logger.log('🔄 Starting OpenAQ measurements sync...');

    try {
      const stations = await this.stationRepo.findAll(); // Fetch all synced stations

      for (const station of stations) {
        if (!station.openaqStationId) continue; // skip local-only stations

        const res = await axios.get(`${this.baseUrl}/latest`, {
          params: { location_id: station.openaqStationId },
        });

        const measurements = res.data.results[0]?.measurements ?? [];

        for (const m of measurements) {
          await this.airQualityService.createReading(station.id, {
            pm25: m.parameter === 'pm25' ? m.value : 0,
            pm10: m.parameter === 'pm10' ? m.value : 0,
            co: m.parameter === 'co' ? m.value : null,
            no2: m.parameter === 'no2' ? m.value : null,
            o3: m.parameter === 'o3' ? m.value : null,
          });
        }
      }

      this.logger.log(`✅ OpenAQ measurements sync completed.`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ OpenAQ measurements sync failed. Error: ${msg}`);
    }
  }
}
