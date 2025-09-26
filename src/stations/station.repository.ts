import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma, Station } from '@prisma/client';
import { UnifiedStationResponseDto } from './dto/unified-station-response.dto.js';

@Injectable()
export class StationRepository {
  private readonly logger = new Logger(StationRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: Omit<Station, 'id' | 'createdAt'>): Promise<Station> {
    this.logger.log(`Creating new station with name: ${data.name}`);
    try {
      const result = await this.prisma.station.create({ data });
      this.logger.log(`Successfully created station with ID: ${result.id}`);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create station. Error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to create station in the database.');
    }
  }

  async findAll(filter?: { city?: string; country?: string }): Promise<Station[]> {
    this.logger.log('Fetching all stations...');
    try {
      const result = await this.prisma.station.findMany({
        where: {
          ...(filter?.city && { city: filter.city }),
          ...(filter?.country && { country: filter.country }),
        },
        orderBy: { createdAt: 'desc' },
      });
      this.logger.log(`Found ${result.length} stations.`);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch all stations. Error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to retrieve stations from the database.');
    }
  }

  async findById(id: number): Promise<Station | null> {
    this.logger.log(`Fetching station by ID: ${id}`);
    try {
      const result = await this.prisma.station.findUnique({ where: { id } });
      if (result) {
        this.logger.log(`Found station with ID: ${id}`);
      } else {
        this.logger.warn(`No station found with ID: ${id}`);
      }
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch station by ID ${id}. Error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to retrieve station from the database.');
    }
  }

  async findByCity(city: string): Promise<Station[]> {
    this.logger.log(`Fetching stations in city: ${city}`);
    try {
      const result = await this.prisma.station.findMany({ where: { city } });
      this.logger.log(`Found ${result.length} stations in ${city}.`);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch stations by city ${city}. Error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to retrieve stations by city from the database.');
    }
  }

  async findByNameAndCity(name: string, city: string): Promise<Station | null> {
    this.logger.log(`Checking for existing station named "${name}" in "${city}"`);
    try {
      return this.prisma.station.findFirst({ where: { name, city } });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Database query failed for station check. Error: ${errorMessage}`);
      throw new InternalServerErrorException('Database error during station lookup.');
    }
  }

  async update(id: number, data: Partial<Station>): Promise<Station> {
    this.logger.log(`Updating station with ID: ${id}`);
    try {
      const result = await this.prisma.station.update({ where: { id }, data });
      this.logger.log(`Station updated successfully: ${result.id}`);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update station ID ${id}. Error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to update station in the database.');
    }
  }

  async delete(id: number): Promise<Station> {
    this.logger.log(`Deleting station with ID: ${id}`);
    try {
      // Use a transaction to ensure both deletes happen or neither do.
      const result = await this.prisma.$transaction(async (tx) => {
        // First, delete all related air quality readings
        await tx.airQuality.deleteMany({ where: { stationId: id } });
        // Then, delete the station
        return tx.station.delete({ where: { id } });
      });
      this.logger.log(`Station and its readings deleted successfully: ${result.id}`);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete station ID ${id}. Error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to delete station from the database.');
    }
  }

  async findFirst(where: Prisma.StationWhereInput): Promise<Station | null> {
    this.logger.log(`Finding first station with where: ${JSON.stringify(where)}`);
    try {
      return this.prisma.station.findFirst({ where });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Database query failed for findFirst station. Error: ${errorMessage}`,
      );
      throw new InternalServerErrorException(
        'Database error during station lookup.',
      );
    }
  }

  async findUnified(
    filter?: { city?: string; country?: string; source?: 'local' | 'openaq' },
    pagination?: { page: number; limit: number },
  ): Promise<{ data: UnifiedStationResponseDto[]; total: number }> {
    this.logger.log(`Finding unified stations with filter: ${JSON.stringify(filter)}`);
    const { city, country, source } = filter || {};
    const { page = 1, limit = 10 } = pagination || {};
    const skip = (page - 1) * limit;

    const where: Prisma.StationWhereInput = {
      ...(city && { city: { contains: city, mode: 'insensitive' } }),
      ...(country && { country }),
      ...(source && { source }),
    };

    try {
      const [stations, total] = await this.prisma.$transaction([
        this.prisma.station.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.station.count({ where }),
      ]);

      const data = stations.map((s) => ({
        id: s.source === 'openaq' ? `openaq-${s.externalId}` : `local-${s.id}`,
        name: s.name,
        city: s.city,
        country: s.country,
        latitude: s.latitude,
        longitude: s.longitude,
        source: s.source as 'local' | 'openaq',
      }));

      return { data, total };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to find unified stations. Error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to retrieve unified stations.');
    }
  }

  async upsertFromOpenAQ(stationData: {
    externalId: string;
    name: string;
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  }): Promise<Station> {
    this.logger.log(`🔄 Upserting OpenAQ station [${stationData.externalId}] (${stationData.name})`);

    const { externalId, ...restOfData } = stationData;

    const existing = await this.prisma.station.findFirst({
      where: { externalId },
    });

    try {
      if (existing) {
        const result = await this.prisma.station.update({
          where: { id: existing.id },
          data: restOfData,
        });
        this.logger.log(`✅ Updated station: ${result.name} (${result.city})`);
        return result;
      }

      const result = await this.prisma.station.create({
        data: { ...stationData, source: 'openaq' },
      });
      this.logger.log(`✅ Created station: ${result.name} (${result.city})`);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Failed to upsert OpenAQ station ${externalId}. Error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to sync OpenAQ station.');
    }
  }
}
