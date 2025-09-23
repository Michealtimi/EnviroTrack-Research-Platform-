import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { StationService } from '../stations/station.service.js';
import { AirQualityService } from '../air-quality/air-quality.service.js';

@Injectable()
export class OpenAQSyncService {
  private readonly logger = new Logger(OpenAQSyncService.name);
  private readonly baseUrl = 'https://api.openaq.org/v2'; // OpenAQ API base URL
  private readonly pageLimit = 100; // pagination limit

  constructor(
    private readonly stationService: StationService, // service for Station table
    private readonly airQualityService: AirQualityService, // service for readings
  ) {}

  /* ----------------- CRON JOB ----------------- */
  // Runs every hour
  @Cron(CronExpression.EVERY_HOUR)
  async syncOpenAQ() {
    this.logger.log('🔄 Starting OpenAQ sync...');
    try {
      await this.syncStations();
      await this.syncParametersAndMeasurements();
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
          await this.stationService.createOrUpdateFromOpenAQ({
            openaqStationId: s.id.toString(),
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
    } while (fetched === this.pageLimit); // loop until last page
  }

  /* ----------------- PARAMETERS + MEASUREMENTS ----------------- */
  private async syncParametersAndMeasurements() {
    this.logger.log('📊 Syncing OpenAQ parameters and latest measurements...');
    let page = 1;
    let fetched = 0;

    do {
      const res = await axios.get(`${this.baseUrl}/measurements`, {
        params: { limit: this.pageLimit, page },
      });
      const measurements = res.data?.results || [];
      fetched = measurements.length;

      for (const m of measurements) {
        try {
          // Upsert parameter
          await this.airQualityService.upsertParameter({
            id: m.parameter_id,
            name: m.parameter,
            displayName: m.parameter,
            units: m.unit,
            description: m.parameter, // OpenAQ does not always provide description
          });

          // Map to local station
          const station = await this.stationService.findByOpenAQId(m.location_id.toString());
          if (!station) continue; // skip if station not synced yet

          // Create air quality reading
          await this.airQualityService.createReading(station.id, {
            pm25: m.parameter === 'pm25' ? m.value : 0,
            pm10: m.parameter === 'pm10' ? m.value : 0,
            co: m.parameter === 'co' ? m.value : null,
            no2: m.parameter === 'no2' ? m.value : null,
            o3: m.parameter === 'o3' ? m.value : null,
          });

          this.logger.log(`✅ Measurement synced for station: ${station.name}, parameter: ${m.parameter}`);
        } catch (err: unknown) {
          this.logger.error(
            `Failed to sync measurement for location ${m.location_id}: ${err instanceof Error ? err.message : 'Unknown error'}`,
          );
        }
      }

      page++;
    } while (fetched === this.pageLimit); // loop until last page
  }
}
