import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { StationRepository } from '../stations/station.repository.js';
import { StationService } from '../stations/station.service.js';
import { AirQualityService } from '../air-quality/air-quality.service.js';
import { OpenAQParameterDto } from './dto/openaq-parameter.dto.js';
import { OpenAQMeasurementDto } from './dto/openaq-measurement.dto.js';

@Injectable()
export class OpenAQService {
  private readonly logger = new Logger(OpenAQService.name);
  private readonly baseUrl = 'https://api.openaq.org/v3';

  constructor(
    private readonly stationRepo: StationRepository,
    private readonly stationService: StationService,
    private readonly airQualityService: AirQualityService,
  ) {}

  /** Sync parameters from OpenAQ */
  async syncParameters(params: OpenAQParameterDto[]) {
    this.logger.log(`Syncing ${params.length} OpenAQ parameters...`);

    try {
      const results = [];

      for (const param of params) {
        const res = await axios.get(`${this.baseUrl}/parameters`, { params: param });
        results.push(...res.data.results);
      }

      return { success: true, parametersSynced: results.length, data: results };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to sync parameters: ${msg}`);
      throw error;
    }
  }

  /** Sync measurements from OpenAQ */
  async syncMeasurements(measurements: OpenAQMeasurementDto[]) {
    this.logger.log(`Syncing ${measurements.length} OpenAQ measurements...`);

    try {
      const results = [];

      for (const measurement of measurements) {
        const res = await axios.get(`${this.baseUrl}/measurements`, { params: measurement });
        results.push(...res.data.results);

        // Save each measurement to the database
        for (const m of res.data.results) {
          const station = await this.stationService.findByExternalId(m.locationId?.toString());
          if (!station) continue;

          await this.airQualityService.createReading(station.id, {
            pm25: m.parameter === 'pm25' ? m.value : 0,
            pm10: m.parameter === 'pm10' ? m.value : 0,
            co: m.parameter === 'co' ? m.value : null,
            no2: m.parameter === 'no2' ? m.value : null,
            o3: m.parameter === 'o3' ? m.value : null,
          }, 'openaq');
        }
      }

      return { success: true, measurementsSynced: results.length, data: results };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to sync measurements: ${msg}`);
      throw error;
    }
  }

  /** Full sync of parameters + measurements */
  async fullOpenAQSync(data: { parameters: OpenAQParameterDto[]; measurements: OpenAQMeasurementDto[] }) {
    this.logger.log(`Starting full OpenAQ sync...`);

    await this.syncParameters(data.parameters);
    await this.syncMeasurements(data.measurements);

    this.logger.log(`✅ Full OpenAQ sync completed`);
    return { success: true };
  }
}
