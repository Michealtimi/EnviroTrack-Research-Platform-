import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Station } from '@prisma/client';

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
      const result = await this.prisma.station.delete({ where: { id } });
      this.logger.log(`Station deleted successfully: ${result.id}`);
      return result;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete station ID ${id}. Error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to delete station from the database.');
    }
  }
}