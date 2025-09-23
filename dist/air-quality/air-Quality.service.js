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
    async createReading(stationId, data) {
        this.logger.log(`Attempting to create reading for station ID: ${stationId}`);
        try {
            const station = await this.stationRepo.findById(stationId);
            if (!station) {
                this.logger.warn(`Creation failed: Station with ID '${stationId}' not found.`);
                throw new NotFoundException(`Station with ID ${stationId} not found`);
            }
            const { pm25, pm10, co, no2, o3 } = data;
            const readingData = { stationId, pm25, pm10, co, no2, o3 };
            const createdReading = await this.airQualityRepo.create(readingData);
            this.logger.log(`Reading created successfully for station: ${stationId}`);
            return plainToInstance(AirQualityReadingResponseDto, createdReading, {
                excludeExtraneousValues: true,
            });
        }
        catch (error) {
            if (error instanceof NotFoundException)
                throw error;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Reading creation failed. Error: ${errorMessage}`);
            throw new InternalServerErrorException('Failed to create reading. Please try again later.');
        }
    }
    /* ----------------- DATA RETRIEVAL ----------------- */
    async getReadingsByStation(stationId) {
        this.logger.log(`Fetching readings for station ID: ${stationId}`);
        try {
            const readings = await this.airQualityRepo.findAll({ stationId });
            this.logger.log(`Found ${readings.length} readings for station ${stationId}`);
            return plainToInstance(AirQualityReadingResponseDto, readings, {
                excludeExtraneousValues: true,
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to fetch readings for station ${stationId}. Error: ${errorMessage}`);
            throw new InternalServerErrorException(`Failed to retrieve readings for station ${stationId}.`);
        }
    }
    async getReadingsByCity(city) {
        this.logger.log(`Fetching readings for city: ${city}`);
        try {
            const readings = await this.airQualityRepo.findAll({ city });
            this.logger.log(`Found ${readings.length} readings for city ${city}`);
            return plainToInstance(AirQualityReadingResponseDto, readings, {
                excludeExtraneousValues: true,
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to fetch readings for city ${city}. Error: ${errorMessage}`);
            throw new InternalServerErrorException(`Failed to retrieve readings for city ${city}.`);
        }
    }
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
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to fetch latest reading for station ${stationId}. Error: ${errorMessage}`);
            throw new InternalServerErrorException(`Failed to retrieve latest reading for station ${stationId}.`);
        }
    }
    /* ----------------- DATA ANALYSIS ----------------- */
    async getAveragePollutionByCity(city) {
        this.logger.log(`Calculating average pollution for city: ${city}`);
        try {
            const averages = await this.airQualityRepo.aggregateByCity(city);
            this.logger.log(`Averages calculated for ${city}:`, averages);
            return averages;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to calculate averages for city ${city}. Error: ${errorMessage}`);
            throw new InternalServerErrorException(`Failed to calculate averages for city ${city}.`);
        }
    }
    async getHazardousReadings(city) {
        this.logger.log(`Checking for hazardous readings in city: ${city}`);
        try {
            const readings = await this.airQualityRepo.findAll({ city });
            const hazardous = readings.filter((r) => r.pm25 > 25 || r.pm10 > 50);
            this.logger.log(`Found ${hazardous.length} hazardous readings in ${city}`);
            return plainToInstance(AirQualityReadingResponseDto, hazardous, {
                excludeExtraneousValues: true,
            });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to find hazardous readings for city ${city}. Error: ${errorMessage}`);
            throw new InternalServerErrorException(`Failed to retrieve hazardous readings for city ${city}.`);
        }
    }
    /* ----------------- OPENAQ INTEGRATION ----------------- */
    // ✅ Added: Upsert a single OpenAQ parameter
    async upsertParameter(param) {
        this.logger.log(`Upserting OpenAQ parameter [${param.id}]: ${param.name}`);
        try {
            const existing = await this.airQualityRepo.findParameterById(param.id);
            if (existing) {
                const updated = await this.airQualityRepo.updateParameter(param.id, {
                    name: param.name,
                    displayName: param.displayName,
                    units: param.units,
                    description: param.description,
                });
                this.logger.log(`✅ Updated OpenAQ parameter: ${updated.name}`);
                return updated;
            }
            else {
                const created = await this.airQualityRepo.createParameter(param);
                this.logger.log(`✅ Created OpenAQ parameter: ${created.name}`);
                return created;
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`❌ Failed to upsert OpenAQ parameter ${param.name}. Error: ${errorMessage}`);
            throw new InternalServerErrorException('Failed to upsert OpenAQ parameter.');
        }
    }
    // ✅ Added: Bulk sync OpenAQ parameters
    async syncOpenAQParameters(params) {
        this.logger.log(`Starting sync of ${params.length} OpenAQ parameters`);
        const results = [];
        for (const param of params) {
            results.push(await this.upsertParameter(param));
        }
        this.logger.log(`Completed sync of OpenAQ parameters`);
        return results;
    }
    // ✅ Added: Sync OpenAQ measurements
    async syncOpenAQMeasurements(measurements) {
        this.logger.log(`Starting sync of ${measurements.length} OpenAQ measurements`);
        const results = [];
        for (const m of measurements) {
            try {
                const reading = await this.airQualityRepo.create({
                    stationId: m.stationId,
                    pm25: m.parameterId === 1 ? m.value : 0,
                    pm10: m.parameterId === 2 ? m.value : 0,
                    co: m.parameterId === 3 ? m.value : null,
                    no2: m.parameterId === 4 ? m.value : null,
                    o3: m.parameterId === 5 ? m.value : null,
                });
                results.push(reading);
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                this.logger.error(`Failed to sync measurement for station ${m.stationId}. Error: ${errorMessage}`);
            }
        }
        this.logger.log(`Completed sync of OpenAQ measurements`);
        return results;
    }
    // ✅ Added: Full OpenAQ sync (parameters + measurements)
    async fullOpenAQSync(openAQData) {
        this.logger.log(`Starting full OpenAQ sync`);
        try {
            await this.syncOpenAQParameters(openAQData.parameters);
            await this.syncOpenAQMeasurements(openAQData.measurements);
            this.logger.log(`Full OpenAQ sync completed successfully`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Full OpenAQ sync failed. Error: ${errorMessage}`);
            throw new InternalServerErrorException('Failed to complete OpenAQ sync.');
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