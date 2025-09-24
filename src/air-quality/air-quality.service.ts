import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { AirQualityReadingResponseDto } from './dto/air-quality-response.dto.js';
import { StationRepository } from '../stations/station.repository.js';
import { AirQualityRepository } from './air-quality.repository.js';
import { AirQuality } from '@prisma/client';

@Injectable()
export class AirQualityService {
  private readonly logger = new Logger(AirQualityService.name);

  constructor(
    private readonly airQualityRepo: AirQualityRepository,
    private readonly stationRepo: StationRepository,
  ) {}

  /* ----------------- DATA CREATION ----------------- */
  async createReading(
    stationId: number,
    data: { pm25: number; pm10: number; co: number | null; no2: number | null; o3: number | null },
    source: 'local' | 'openaq' = 'local',
  ) {
    try {
      const station = await this.stationRepo.findById(stationId);
      if (!station) throw new NotFoundException(`Station with ID ${stationId} not found`);

      const { pm25, pm10, co, no2, o3 } = data;
      const createdReading = await this.airQualityRepo.create({
        stationId,
        pm25,
        pm10,
        co,
        no2,
        o3,
        source,
      });

      return plainToInstance(AirQualityReadingResponseDto, createdReading, { excludeExtraneousValues: true });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create reading: ${msg}`);
      throw new InternalServerErrorException('Failed to create reading.');
    }
  }

  /* ----------------- DATA RETRIEVAL ----------------- */
  async getReadingsByStation(stationId: number) {
    try {
      const readings = await this.airQualityRepo.findAll({ stationId });
      return plainToInstance(AirQualityReadingResponseDto, readings, { excludeExtraneousValues: true });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch readings for station ${stationId}: ${msg}`);
      throw new InternalServerErrorException('Failed to retrieve readings for station.');
    }
  }

  async getReadingsByCity(city: string) {
    try {
      const readings = await this.airQualityRepo.findAll({ city });
      return plainToInstance(AirQualityReadingResponseDto, readings, { excludeExtraneousValues: true });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch readings for city ${city}: ${msg}`);
      throw new InternalServerErrorException('Failed to retrieve readings for city.');
    }
  }

  async getLatestReadingByStation(stationId: number) {
    try {
      const latest = await this.airQualityRepo.findLatestByStation(stationId);
      if (!latest) return null;
      return plainToInstance(AirQualityReadingResponseDto, latest, { excludeExtraneousValues: true });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch latest reading for station ${stationId}: ${msg}`);
      throw new InternalServerErrorException('Failed to retrieve latest reading.');
    }
  }

  /* ----------------- DATA ANALYSIS ----------------- */
  async getAveragePollutionByCity(city: string) {
    try {
      return await this.airQualityRepo.aggregateByCity(city);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to calculate averages for city ${city}: ${msg}`);
      throw new InternalServerErrorException('Failed to calculate averages.');
    }
  }

  async getHazardousReadings(city: string) {
    try {
      const readings = await this.airQualityRepo.findAll({ city });
      const hazardous = readings.filter((r: AirQuality) => r.pm25 > 25 || r.pm10 > 50);
      return plainToInstance(AirQualityReadingResponseDto, hazardous, { excludeExtraneousValues: true });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch hazardous readings for city ${city}: ${msg}`);
      throw new InternalServerErrorException('Failed to fetch hazardous readings.');
    }
  }
}