var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AirQualityRepository_1;
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
/**
 * Repository Layer for AirQuality & OpenAQ
 * ----------------------------------------
 * Handles all database interactions via Prisma.
 * Includes CRUD operations, advanced queries, and OpenAQ parameter management.
 */
let AirQualityRepository = AirQualityRepository_1 = class AirQualityRepository {
    prisma;
    logger = new Logger(AirQualityRepository_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    /* ----------------- BASIC CRUD OPERATIONS ----------------- */
    /** Create a new air quality reading */
    async create(data) {
        this.logger.log(`Creating new air quality reading...`);
        try {
            const result = await this.prisma.airQuality.create({ data });
            this.logger.log(`Successfully created reading with ID: ${result.id}`);
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to create air quality reading. Error: ${errorMessage}`);
            throw new InternalServerErrorException('Failed to create air quality reading.');
        }
    }
    /** Fetch a reading by ID */
    async findById(id) {
        this.logger.log(`Fetching reading by ID: ${id}`);
        try {
            const result = await this.prisma.airQuality.findUnique({ where: { id } });
            if (result)
                this.logger.log(`Found reading with ID: ${id}`);
            else
                this.logger.warn(`No reading found with ID: ${id}`);
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to fetch reading by ID ${id}. Error: ${errorMessage}`);
            throw new InternalServerErrorException('Failed to retrieve reading.');
        }
    }
    /** Fetch all readings with optional filters */
    async findAll(filter) {
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
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to fetch all readings. Error: ${errorMessage}`);
            throw new InternalServerErrorException('Failed to retrieve all readings.');
        }
    }
    /** Delete a reading */
    async delete(id) {
        this.logger.log(`Deleting reading with ID: ${id}`);
        try {
            const result = await this.prisma.airQuality.delete({ where: { id } });
            this.logger.log(`Successfully deleted reading with ID: ${id}`);
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to delete reading with ID ${id}. Error: ${errorMessage}`);
            throw new InternalServerErrorException('Failed to delete reading.');
        }
    }
    /* ----------------- ADVANCED QUERIES ----------------- */
    /** Latest reading for a station */
    async findLatestByStation(stationId) {
        this.logger.log(`Fetching latest reading for station: ${stationId}`);
        try {
            return await this.prisma.airQuality.findFirst({
                where: { stationId },
                orderBy: { createdAt: 'desc' },
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to fetch latest reading for station ${stationId}. Error: ${errorMessage}`);
            throw new InternalServerErrorException('Failed to retrieve latest reading.');
        }
    }
    /** Find readings in a date range */
    async findByDateRange(stationId, start, end) {
        this.logger.log(`Fetching readings for station ${stationId} between ${start.toISOString()} and ${end.toISOString()}`);
        try {
            return await this.prisma.airQuality.findMany({
                where: { stationId, createdAt: { gte: start, lte: end } },
                orderBy: { createdAt: 'asc' },
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to fetch readings for station ${stationId} in date range. Error: ${errorMessage}`);
            throw new InternalServerErrorException('Failed to retrieve readings in date range.');
        }
    }
    /** Aggregate average by city */
    async aggregateByCity(city) {
        this.logger.log(`Aggregating air quality for city: ${city}`);
        try {
            const result = await this.prisma.airQuality.aggregate({
                where: { station: { city } },
                _avg: { pm25: true, pm10: true, no2: true, o3: true },
                _count: true,
            });
            this.logger.log(`Aggregation complete for city: ${city}`);
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to aggregate by city ${city}. Error: ${errorMessage}`);
            throw new InternalServerErrorException('Failed to perform city aggregation.');
        }
    }
    /** Aggregate average by station */
    async aggregateByStation(stationId) {
        this.logger.log(`Aggregating air quality for station: ${stationId}`);
        try {
            const result = await this.prisma.airQuality.aggregate({
                where: { stationId },
                _avg: { pm25: true, pm10: true, no2: true, o3: true },
                _count: true,
            });
            this.logger.log(`Aggregation complete for station: ${stationId}`);
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to aggregate by station ${stationId}. Error: ${errorMessage}`);
            throw new InternalServerErrorException('Failed to perform station aggregation.');
        }
    }
};
AirQualityRepository = AirQualityRepository_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], AirQualityRepository);
export { AirQualityRepository };
//# sourceMappingURL=air-quality.repository.js.map