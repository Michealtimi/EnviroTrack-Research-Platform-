import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { StationService } from '../stations/station.service.js';
import { AirQualityService } from '../air-quality/air-quality.service.js';

interface OpenAQLocation {
  id: number;
  name: string;
  locality?: string | null;
  country?: { code?: string; name?: string } | null;
  coordinates?: { latitude?: number; longitude?: number } | null;
  sensors?: { id: number; parameter?: { name?: string } }[];
}

interface OpenAQLatestResult {
  sensorsId: number;
  value: number;
}

@Injectable()
export class OpenAQSyncService {
  private readonly logger = new Logger(OpenAQSyncService.name);
  private readonly baseUrl = 'https://api.openaq.org/v3';
  private readonly apiKey: string;
  private readonly pageLimit = 100;
  private readonly maxLocations: number;
  private readonly countryIso?: string;

  constructor(
    private readonly stationService: StationService,
    private readonly airQualityService: AirQualityService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiKey = this.configService.get<string>('OPENAQ_API_KEY') ?? '';
    this.maxLocations = Number(this.configService.get<string>('OPENAQ_SYNC_MAX_LOCATIONS')) || 50;
    this.countryIso = this.configService.get<string>('OPENAQ_SYNC_COUNTRY_ISO') || undefined;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async syncOpenAQ() {
    this.logger.log('🔄 Starting OpenAQ v3 sync...');
    try {
      const sensorParameterMap = await this.syncStations();
      await this.syncLatestMeasurements(sensorParameterMap);
      this.logger.log('✅ OpenAQ sync completed successfully.');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ OpenAQ sync failed. Error: ${errorMessage}`);
    }
  }

  // ponytail: v1 caps sync to `maxLocations` (optionally one country) to stay inside the
  // free-tier rate limit. Raise/drop the cap once on a paid key or full coverage is needed.
  private async syncStations(): Promise<Map<number, string>> {
    this.logger.log('📡 Syncing OpenAQ locations (v3)...');
    const sensorParameterMap = new Map<number, string>();
    let page = 1;
    let synced = 0;

    while (synced < this.maxLocations) {
      const res = await firstValueFrom(
        this.httpService.get<{ results: OpenAQLocation[] }>(`${this.baseUrl}/locations`, {
          params: {
            limit: Math.min(this.pageLimit, this.maxLocations - synced),
            page,
            ...(this.countryIso && { iso: this.countryIso }),
          },
          headers: { 'X-API-Key': this.apiKey },
        }),
      );
      const locations = res.data?.results ?? [];
      if (locations.length === 0) break;

      for (const loc of locations) {
        if (synced >= this.maxLocations) break;
        try {
          await this.stationService.upsertFromOpenAQ({
            externalId: loc.id.toString(),
            name: loc.name,
            city: loc.locality ?? loc.country?.name ?? 'Unknown',
            country: loc.country?.name ?? loc.country?.code ?? 'Unknown',
            latitude: loc.coordinates?.latitude ?? 0,
            longitude: loc.coordinates?.longitude ?? 0,
          });
          for (const sensor of loc.sensors ?? []) {
            if (sensor.parameter?.name) sensorParameterMap.set(sensor.id, sensor.parameter.name);
          }
          synced++;
        } catch (err: unknown) {
          this.logger.error(`Failed to sync location ${loc.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      page++;
    }

    this.logger.log(`✅ Synced ${synced} OpenAQ locations.`);
    return sensorParameterMap;
  }

  private async syncLatestMeasurements(sensorParameterMap: Map<number, string>) {
    this.logger.log('📊 Syncing latest OpenAQ measurements (v3)...');
    const syncedStations = await this.stationService.getAllStations();
    const openaqStations = syncedStations.filter((s) => s.source === 'openaq' && s.externalId);

    for (const station of openaqStations) {
      try {
        const res = await firstValueFrom(
          this.httpService.get<{ results: OpenAQLatestResult[] }>(
            `${this.baseUrl}/locations/${station.externalId}/latest`,
            { headers: { 'X-API-Key': this.apiKey } },
          ),
        );
        const results = res.data?.results ?? [];
        if (results.length === 0) continue;

        const reading: Record<string, number | null> = {
          pm25: null, pm10: null, co: null, no2: null, o3: null, so2: null,
        };
        let matched = false;
        for (const r of results) {
          const paramName = sensorParameterMap.get(r.sensorsId);
          if (paramName && paramName in reading) {
            reading[paramName] = r.value;
            matched = true;
          }
        }
        if (!matched) {
          this.logger.warn(
            `No known pollutant matched for station ${station.name} (${station.externalId}) - ${results.length} sensor reading(s) returned but none mapped to a tracked parameter. Skipping empty reading.`,
          );
          continue;
        }
        await this.airQualityService.createReading(
          station.id,
          reading as { pm25: number | null; pm10: number | null; co: number | null; no2: number | null; o3: number | null; so2: number | null },
          'openaq',
        );
      } catch (err: unknown) {
        this.logger.error(`Failed to sync measurements for station ${station.name} (${station.externalId}): ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    this.logger.log('✅ Measurements sync process completed.');
  }
}
