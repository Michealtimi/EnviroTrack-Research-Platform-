import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AirQuality } from '@prisma/client';

/**
 * Repository Layer for AirQuality & OpenAQ
 * ----------------------------------------
 * Handles all database interactions via Prisma.
 * Includes CRUD operations, advanced queries, and OpenAQ parameter management.
 */
@Injectable()
export class AirQualityRepository {
  private readonly logger = new Logger(AirQualityRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  /* ----------------- BASIC CRUD OPERATIONS ----------------- */

  /** Create a new air quality reading */
  async create(data: Omit<AirQuality, 'id' | 'createdAt'>): Promise<AirQuality> {
    this.logger.log(`Creating new air quality reading...`);
    try {
      const result = await this.prisma.airQuality.create({ data });
      this.logger.log(`Successfully created reading with ID: ${result.id}`);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create air quality reading. Error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to create air quality reading.');
    }
  }

  /** Fetch a reading by ID */
  async findById(id: string): Promise<AirQuality | null> {
    this.logger.log(`Fetching reading by ID: ${id}`);
    try {
      const result = await this.prisma.airQuality.findUnique({ where: { id } });
      if (result) this.logger.log(`Found reading with ID: ${id}`);
      else this.logger.warn(`No reading found with ID: ${id}`);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch reading by ID ${id}. Error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to retrieve reading.');
    }
  }

  /** Fetch all readings with optional filters */
  async findAll(filter?: { city?: string; stationId?: number }): Promise<AirQuality[]> {
    this.logger.log(`Fetching all readings with filter: ${JSON.stringify(filter)}`);
    try {
      const result = await this.prisma.airQuality.findMany({
        where: {
          ...(filter?.city && { station: { city: filter.city } }), // filter by related station's city
          ...(filter?.stationId && { stationId: filter.stationId }),
        },
        orderBy: { createdAt: 'desc' },
      });
      this.logger.log(`Found ${result.length} readings.`);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch all readings. Error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to retrieve all readings.');
    }
  }

  /** Delete a reading */
  async delete(id: string): Promise<AirQuality> {
    this.logger.log(`Deleting reading with ID: ${id}`);
    try {
      const result = await this.prisma.airQuality.delete({ where: { id } });
      this.logger.log(`Successfully deleted reading with ID: ${id}`);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete reading with ID ${id}. Error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to delete reading.');
    }
  }

  /* ----------------- ADVANCED QUERIES ----------------- */

  /** Latest reading for a station */
  async findLatestByStation(stationId: number): Promise<AirQuality | null> {
    this.logger.log(`Fetching latest reading for station: ${stationId}`);
    try {
      return await this.prisma.airQuality.findFirst({
        where: { stationId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch latest reading for station ${stationId}. Error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to retrieve latest reading.');
    }
  }

  /** Find readings in a date range */
  async findByDateRange(stationId: number, start: Date, end: Date): Promise<AirQuality[]> {
    this.logger.log(`Fetching readings for station ${stationId} between ${start.toISOString()} and ${end.toISOString()}`);
    try {
      return await this.prisma.airQuality.findMany({
        where: { stationId, createdAt: { gte: start, lte: end } },
        orderBy: { createdAt: 'asc' },
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch readings for station ${stationId} in date range. Error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to retrieve readings in date range.');
    }
  }

  /** Aggregate average by city */
  async aggregateByCity(city: string) {
    this.logger.log(`Aggregating air quality for city: ${city}`);
    try {
      const result = await this.prisma.airQuality.aggregate({
        where: { station: { city } },
        _avg: { pm25: true, pm10: true, no2: true, o3: true },
        _count: true,
      });
      this.logger.log(`Aggregation complete for city: ${city}`);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to aggregate by city ${city}. Error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to perform city aggregation.');
    }
  }

  /** Aggregate average by station */
  async aggregateByStation(stationId: number) {
    this.logger.log(`Aggregating air quality for station: ${stationId}`);
    try {
      const result = await this.prisma.airQuality.aggregate({
        where: { stationId },
        _avg: { pm25: true, pm10: true, no2: true, o3: true },
        _count: true,
      });
      this.logger.log(`Aggregation complete for station: ${stationId}`);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to aggregate by station ${stationId}. Error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to perform station aggregation.');
    }
  }
}
