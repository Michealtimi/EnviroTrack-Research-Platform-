// src/air-quality/air-quality.service.ts
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

  /**
   * Create a new air quality reading for a specific station.
   */
  async createReading(
    stationId: number,
    data: { pm25: number; pm10: number; co: number | null; no2: number | null; o3: number | null },
  ) {
    this.logger.log(`Attempting to create reading for station ID: ${stationId}`);

    try {
      // Step 1: Verify station exists
      const station = await this.stationRepo.findById(stationId);
      if (!station) {
        this.logger.warn(`Creation failed: Station with ID '${stationId}' not found.`);
        throw new NotFoundException(`Station with ID ${stationId} not found`);
      }

      const { pm25, pm10, co, no2, o3 } = data;

      // The schema is "wide", so we create a single reading record with all parameters.
      const readingData = { stationId, pm25, pm10, co, no2, o3 };

      // Step 2: Save the reading
      const createdReading = await this.airQualityRepo.create(readingData);

      this.logger.log(`Reading created successfully for station: ${stationId}`);

      // The response DTO is "wide" and now matches the "wide" created record.
      return plainToInstance(AirQualityReadingResponseDto, createdReading, {
        excludeExtraneousValues: true,
      });

    } catch (error: unknown) {
      // FIX: Properly handle 'unknown' error type.
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Reading creation failed. Error: ${errorMessage}`);
      throw new InternalServerErrorException(
        'Failed to create reading. Please try again later.',
      );
    }
  }

  /* ----------------- DATA RETRIEVAL ----------------- */

  /**
   * Get all readings for a station.
   */
  async getReadingsByStation(stationId: number) {
    this.logger.log(`Fetching readings for station ID: ${stationId}`);
    try {
      // FIX: Use the `findAll` method with a filter, which is the correct repository method.
      const readings = await this.airQualityRepo.findAll({ stationId });
      this.logger.log(`Found ${readings.length} readings for station ${stationId}`);
      return plainToInstance(AirQualityReadingResponseDto, readings, {
        excludeExtraneousValues: true,
      });
    } catch (error: unknown) {
      // FIX: Properly handle 'unknown' error type.
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch readings for station ${stationId}. Error: ${errorMessage}`);
      throw new InternalServerErrorException(
        `Failed to retrieve readings for station ${stationId}.`,
      );
    }
  }

  /**
   * Get all readings for a city.
   */
  async getReadingsByCity(city: string) {
    this.logger.log(`Fetching readings for city: ${city}`);
    try {
      // FIX: Use the `findAll` method with a filter, which is the correct repository method.
      const readings = await this.airQualityRepo.findAll({ city });
      this.logger.log(`Found ${readings.length} readings for city ${city}`);
      return plainToInstance(AirQualityReadingResponseDto, readings, {
        excludeExtraneousValues: true,
      });
    } catch (error: unknown) {
      // FIX: Properly handle 'unknown' error type.
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch readings for city ${city}. Error: ${errorMessage}`);
      throw new InternalServerErrorException(
        `Failed to retrieve readings for city ${city}.`,
      );
    }
  }

  /**
   * Get the most recent reading for a station.
   */
  async getLatestReadingByStation(stationId: number) {
    this.logger.log(`Fetching latest reading for station ID: ${stationId}`);
    try {
      const latest = await this.airQualityRepo.findLatestByStation(stationId);
      if (!latest) {
        this.logger.warn(`No readings found for station: ${stationId}`);
        return null;
      }
      this.logger.log(`Latest reading found for station: ${stationId}`);
      return plainToInstance(AirQualityReadingResponseDto, latest, {
        excludeExtraneousValues: true,
      });
    } catch (error: unknown) {
      // FIX: Properly handle 'unknown' error type.
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch latest reading for station ${stationId}. Error: ${errorMessage}`);
      throw new InternalServerErrorException(
        `Failed to retrieve latest reading for station ${stationId}.`,
      );
    }
  }

  /* ----------------- DATA ANALYSIS ----------------- */

  /**
   * Calculate average pollution values for a city.
   */
  async getAveragePollutionByCity(city: string) {
    this.logger.log(`Calculating average pollution for city: ${city}`);
    try {
      // FIX: Use the dedicated `aggregateByCity` method from the repository for efficiency.
      const averages = await this.airQualityRepo.aggregateByCity(city);
      this.logger.log(`Averages calculated for ${city}:`, averages);
      return averages;
    } catch (error: unknown) {
      // FIX: Properly handle 'unknown' error type.
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to calculate averages for city ${city}. Error: ${errorMessage}`);
      throw new InternalServerErrorException(
        `Failed to calculate averages for city ${city}.`,
      );
    }
  }

  /**
   * Flag hazardous readings for a city.
   */
  async getHazardousReadings(city: string) {
    this.logger.log(`Checking for hazardous readings in city: ${city}`);
    try {
      // FIX: Use the `findAll` method with a filter to fetch the readings.
      const readings = await this.airQualityRepo.findAll({ city });

      // FIX: The AirQuality model is "wide", so filter on properties like `pm25` and `pm10` directly.
      const hazardous = readings.filter(
        (r: AirQuality) => r.pm25 > 25 || r.pm10 > 50,
      );

      this.logger.log(`Found ${hazardous.length} hazardous readings in ${city}`);
      return plainToInstance(AirQualityReadingResponseDto, hazardous, {
        excludeExtraneousValues: true,
      });
    } catch (error: unknown) {
      // FIX: Properly handle 'unknown' error type.
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to find hazardous readings for city ${city}. Error: ${errorMessage}`);
      throw new InternalServerErrorException(
        `Failed to retrieve hazardous readings for city ${city}.`,
      );
    }
  }

  // NOTE: The private `calculateAverages` method is no longer needed since
  // the repository now handles this with Prisma's `aggregate` function.
}