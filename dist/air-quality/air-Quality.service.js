var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AirQualityService_1;
// src/air-quality/air-quality.service.ts
import { Injectable, NotFoundException, InternalServerErrorException, Logger, } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { AirQualityReadingResponseDto } from './dto/air-quality-response.dto.js';
import { StationRepository } from '../stations/station.repository.js';
import { AirQualityRepository } from './air-quality.repository.js';
let AirQualityService = AirQualityService_1 = class AirQualityService {
    airQualityRepo;
    stationRepo;
    logger = new Logger(AirQualityService_1.name);
    constructor(airQualityRepo, stationRepo) {
        this.airQualityRepo = airQualityRepo;
        this.stationRepo = stationRepo;
    }
    /* ----------------- DATA CREATION ----------------- */
    /**
     * Create a new air quality reading for a specific station.
     */
    async createReading(stationId, data) {
        this.logger.log(`Attempting to create reading for station ID: ${stationId}`);
        try {
            // Step 1: Verify station exists
            const station = await this.stationRepo.findById(stationId);
            if (!station) {
                this.logger.warn(`Creation failed: Station with ID '${stationId}' not found.`);
                throw new NotFoundException(`Station with ID ${stationId} not found`);
            }
            const { pm25, pm10, co, no2 } = data;
            const recordedAt = new Date();
            // Since the schema is "tall", we create a reading for each parameter.
            const readingsData = [
                { stationId, parameter: 'pm25', value: pm25, unit: 'µg/m³', recordedAt },
                { stationId, parameter: 'pm10', value: pm10, unit: 'µg/m³', recordedAt },
                { stationId, parameter: 'co', value: co, unit: 'ppm', recordedAt },
                { stationId, parameter: 'no2', value: no2, unit: 'ppm', recordedAt },
            ];
            // Step 2: Save the reading
            // We assume the repository's `create` method can handle this or we'd need a `createMany`.
            // For this fix, we'll create them one by one. In a real-world scenario, you'd use a transaction.
            const createdReadings = await Promise.all(readingsData.map(readingData => this.airQualityRepo.create(readingData)));
            this.logger.log(`Reading created successfully for station: ${stationId}`);
            // NOTE: The response DTO is "wide" and doesn't match the "tall" created records.
            // Returning the array of created records for now. You may want to refactor the response DTO.
            return createdReadings;
        }
        catch (error) {
            // FIX: Properly handle 'unknown' error type.
            if (error instanceof NotFoundException) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Reading creation failed. Error: ${errorMessage}`);
            throw new InternalServerErrorException('Failed to create reading. Please try again later.');
        }
    }
    /* ----------------- DATA RETRIEVAL ----------------- */
    /**
     * Get all readings for a station.
     */
    async getReadingsByStation(stationId) {
        this.logger.log(`Fetching readings for station ID: ${stationId}`);
        try {
            // FIX: Use the `findAll` method with a filter, which is the correct repository method.
            const readings = await this.airQualityRepo.findAll({ stationId });
            this.logger.log(`Found ${readings.length} readings for station ${stationId}`);
            return plainToInstance(AirQualityReadingResponseDto, readings, {
                excludeExtraneousValues: true,
            });
        }
        catch (error) {
            // FIX: Properly handle 'unknown' error type.
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to fetch readings for station ${stationId}. Error: ${errorMessage}`);
            throw new InternalServerErrorException(`Failed to retrieve readings for station ${stationId}.`);
        }
    }
    /**
     * Get all readings for a city.
     */
    async getReadingsByCity(city) {
        this.logger.log(`Fetching readings for city: ${city}`);
        try {
            // FIX: Use the `findAll` method with a filter, which is the correct repository method.
            const readings = await this.airQualityRepo.findAll({ city });
            this.logger.log(`Found ${readings.length} readings for city ${city}`);
            return plainToInstance(AirQualityReadingResponseDto, readings, {
                excludeExtraneousValues: true,
            });
        }
        catch (error) {
            // FIX: Properly handle 'unknown' error type.
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to fetch readings for city ${city}. Error: ${errorMessage}`);
            throw new InternalServerErrorException(`Failed to retrieve readings for city ${city}.`);
        }
    }
    /**
     * Get the most recent reading for a station.
     */
    async getLatestReadingByStation(stationId) {
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
        }
        catch (error) {
            // FIX: Properly handle 'unknown' error type.
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to fetch latest reading for station ${stationId}. Error: ${errorMessage}`);
            throw new InternalServerErrorException(`Failed to retrieve latest reading for station ${stationId}.`);
        }
    }
    /* ----------------- DATA ANALYSIS ----------------- */
    /**
     * Calculate average pollution values for a city.
     */
    async getAveragePollutionByCity(city) {
        this.logger.log(`Calculating average pollution for city: ${city}`);
        try {
            // FIX: Use the dedicated `aggregateByCity` method from the repository for efficiency.
            const averages = await this.airQualityRepo.aggregateByCity(city);
            this.logger.log(`Averages calculated for ${city}:`, averages);
            return averages;
        }
        catch (error) {
            // FIX: Properly handle 'unknown' error type.
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to calculate averages for city ${city}. Error: ${errorMessage}`);
            throw new InternalServerErrorException(`Failed to calculate averages for city ${city}.`);
        }
    }
    /**
     * Flag hazardous readings for a city.
     */
    async getHazardousReadings(city) {
        this.logger.log(`Checking for hazardous readings in city: ${city}`);
        try {
            // FIX: Use the `findAll` method with a filter to fetch the readings.
            const readings = await this.airQualityRepo.findAll({ city });
            // FIX: Explicitly type the 'r' parameter to resolve the TS7006 error.
            const hazardous = readings.filter((r) => (r.parameter === 'pm25' && r.value > 25) || (r.parameter === 'pm10' && r.value > 50));
            this.logger.log(`Found ${hazardous.length} hazardous readings in ${city}`);
            return plainToInstance(AirQualityReadingResponseDto, hazardous, {
                excludeExtraneousValues: true,
            });
        }
        catch (error) {
            // FIX: Properly handle 'unknown' error type.
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to find hazardous readings for city ${city}. Error: ${errorMessage}`);
            throw new InternalServerErrorException(`Failed to retrieve hazardous readings for city ${city}.`);
        }
    }
};
AirQualityService = AirQualityService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [AirQualityRepository,
        StationRepository])
], AirQualityService);
export { AirQualityService };
//# sourceMappingURL=air-quality.service.js.map