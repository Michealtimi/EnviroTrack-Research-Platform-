import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { StationService } from '../stations/station.service.js';
import { AirQualityService } from '../air-quality/air-quality.service.js';

@Injectable()
export class OpenAQSyncService {
  private readonly logger = new Logger(OpenAQSyncService.name);
  private readonly baseUrl = 'https://api.openaq.org/v2';
  private readonly pageLimit = 100;

  constructor(
    private readonly stationService: StationService,
    private readonly airQualityService: AirQualityService,
  ) {}

  /* ----------------- CRON JOB ----------------- */
  @Cron(CronExpression.EVERY_HOUR)
  async syncOpenAQ() {
    this.logger.log('🔄 Starting OpenAQ sync...');
    try {
      await this.syncStations();
      await this.syncLatestMeasurements();
      this.logger.log('✅ OpenAQ sync completed successfully.');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ OpenAQ sync failed. Error: ${errorMessage}`);
    }
  }

  /* ----------------- STATIONS ----------------- */
  private async syncStations() {
    this.logger.log('📡 Syncing OpenAQ stations...');
    let page = 1;
    let fetched = 0;

    do {
      const res = await axios.get(`${this.baseUrl}/locations`, {
        params: { limit: this.pageLimit, page },
      });
      const stations = res.data?.results || [];
      fetched = stations.length;

      for (const s of stations) {
        try {
          await this.stationService.upsertFromOpenAQ({
            externalId: s.id.toString(),
            name: s.name,
            city: s.city ?? 'Unknown',
            country: s.country ?? 'Unknown',
            latitude: s.coordinates?.latitude ?? 0,
            longitude: s.coordinates?.longitude ?? 0,
          });
          this.logger.log(`✅ Station synced: ${s.name} (${s.city})`);
        } catch (err: unknown) {
          this.logger.error(`Failed to sync station ${s.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      page++;
    } while (fetched === this.pageLimit);
  }

  /* ----------------- PARAMETERS + MEASUREMENTS ----------------- */
  private async syncLatestMeasurements() {
    this.logger.log('📊 Syncing latest OpenAQ measurements...');

    const syncedStations = await this.stationService.getAllStations();
    const openaqStations = syncedStations.filter(s => s.source === 'openaq' && s.externalId);

    this.logger.log(`Found ${openaqStations.length} OpenAQ stations to sync measurements for.`);

    for (const station of openaqStations) {
      try {
        const res = await axios.get(`${this.baseUrl}/latest`, {
          params: { location_id: station.externalId },
        });

        const measurements = res.data?.results[0]?.measurements || [];
        if (measurements.length === 0) continue;

        this.logger.log(`Found ${measurements.length} new measurements for station: ${station.name}`);

        for (const m of measurements) {
          await this.airQualityService.createReading(station.id, {
            pm25: m.parameter === 'pm25' ? m.value : 0, // Assuming 0 if not present
            pm10: m.parameter === 'pm10' ? m.value : 0, // Assuming 0 if not present
            co: m.parameter === 'co' ? m.value : null,
            no2: m.parameter === 'no2' ? m.value : null,
            o3: m.parameter === 'o3' ? m.value : null,
          }, 'openaq');
        }
      } catch (err: unknown) {
        this.logger.error(`Failed to sync measurements for station ${station.name} (${station.externalId}): ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    this.logger.log('✅ Measurements sync process completed.');
  }
}