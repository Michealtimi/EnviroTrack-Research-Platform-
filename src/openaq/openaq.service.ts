import { Injectable, Logger } from '@nestjs/common';
import { StationService } from '../stations/station.service.js';
import { AirQualityService } from '../air-quality/air-quality.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { OpenAQParameterDto } from './dto/openaq-parameter.dto.js';
import { OpenAQMeasurementDto } from './dto/openaq-measurement.dto.js';

@Injectable()
export class OpenAQService {
  private readonly logger = new Logger(OpenAQService.name);

  constructor(
    private readonly stationService: StationService,
    private readonly airQualityService: AirQualityService,
    private readonly prisma: PrismaService,
  ) {}

  async findStationByNameAndCity(name: string, city: string) {
    return this.stationService.findByNameAndCity(name, city);
  }

  async syncParameters(params: OpenAQParameterDto[]) {
    this.logger.log(`Processing ${params.length} OpenAQ parameters for local storage...`);
    try {
      const upsertedParameters = [];
      for (const p of params) {
        const upserted = await this.prisma.openAQParameter.upsert({
          where: { id: p.id },
          update: {
            name: p.name,
            displayName: p.displayName,
            units: p.units,
            description: p.description,
          },
          create: {
            id: p.id,
            name: p.name,
            displayName: p.displayName,
            units: p.units,
            description: p.description,
          },
        });
        upsertedParameters.push(upserted);
      }
      this.logger.log(`Successfully processed ${upsertedParameters.length} OpenAQ parameters.`);
      return { success: true, parametersProcessed: upsertedParameters.length, data: upsertedParameters };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process OpenAQ parameters for local storage: ${msg}`);
      throw error;
    }
  }

  async syncMeasurements(measurements: OpenAQMeasurementDto[]) {
    this.logger.log(`Processing ${measurements.length} OpenAQ measurements for local storage...`);
    try {
      // Fetch all parameters once to map names to IDs
      const parameters = await this.prisma.openAQParameter.findMany();
      const parameterNameToId = parameters.reduce((acc, p) => {
        acc[p.name] = p.id;
        return acc;
      }, {} as Record<string, number>);

      // Group measurements by stationId to process them in batches
      const measurementsByStation = measurements.reduce((acc, m) => {
        (acc[m.stationId] = acc[m.stationId] || []).push(m);
        return acc;
      }, {} as Record<string, OpenAQMeasurementDto[]>);

      let totalProcessedCount = 0;

      for (const stationId in measurementsByStation) {
        const station = await this.stationService.findByExternalId(stationId);
        if (!station) {
          this.logger.warn(`Skipping measurements for unknown OpenAQ station ID: ${stationId}`);
          continue;
        }

        const stationMeasurements = measurementsByStation[stationId];
        
        // Assuming all measurements for a station in a single sync batch share a timestamp
        // and can be consolidated into one AirQuality record.
        const airQualityData = {
          pm25: stationMeasurements.find(m => m.parameterId === parameterNameToId['pm25'])?.value ?? 0,
          pm10: stationMeasurements.find(m => m.parameterId === parameterNameToId['pm10'])?.value ?? 0,
          co: stationMeasurements.find(m => m.parameterId === parameterNameToId['co'])?.value ?? null,
          no2: stationMeasurements.find(m => m.parameterId === parameterNameToId['no2'])?.value ?? null,
          o3: stationMeasurements.find(m => m.parameterId === parameterNameToId['o3'])?.value ?? null,
        };

        // The original logic created a new reading for each parameter. This new logic
        // creates one reading with all parameters for a given station and time.
        await this.airQualityService.createReading(station.id, airQualityData, 'openaq');
        totalProcessedCount += stationMeasurements.length;
      }

      this.logger.log(`Successfully processed ${totalProcessedCount} OpenAQ measurements.`);
      return { success: true, measurementsProcessed: totalProcessedCount };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to process OpenAQ measurements for local storage: ${msg}`);
      throw error;
    }
  }

  async fullOpenAQSync(data: { parameters: OpenAQParameterDto[]; measurements: OpenAQMeasurementDto[] }) {
    this.logger.log(`Starting full OpenAQ sync (processing incoming data)...`);
    const parameters = data?.parameters ?? [];
    const measurements = data?.measurements ?? [];
    await this.syncParameters(parameters);
    await this.syncMeasurements(measurements);
    this.logger.log(`✅ Full OpenAQ sync (processing incoming data) completed`);
    return { success: true };
  }
}
