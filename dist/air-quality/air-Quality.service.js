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
    async createReading(stationId, data, source = 'local') {
        try {
            const station = await this.stationRepo.findById(stationId);
            if (!station)
                throw new NotFoundException(`Station with ID ${stationId} not found`);
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
        }
        catch (error) {
            if (error instanceof NotFoundException)
                throw error;
            const msg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to create reading: ${msg}`);
            throw new InternalServerErrorException('Failed to create reading.');
        }
    }
    /* ----------------- DATA RETRIEVAL ----------------- */
    async getReadingsByStation(stationId) {
        try {
            const readings = await this.airQualityRepo.findAll({ stationId });
            return plainToInstance(AirQualityReadingResponseDto, readings, { excludeExtraneousValues: true });
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to fetch readings for station ${stationId}: ${msg}`);
            throw new InternalServerErrorException('Failed to retrieve readings for station.');
        }
    }
    async getReadingsByCity(city) {
        try {
            const readings = await this.airQualityRepo.findAll({ city });
            return plainToInstance(AirQualityReadingResponseDto, readings, { excludeExtraneousValues: true });
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to fetch readings for city ${city}: ${msg}`);
            throw new InternalServerErrorException('Failed to retrieve readings for city.');
        }
    }
    async getLatestReadingByStation(stationId) {
        try {
            const latest = await this.airQualityRepo.findLatestByStation(stationId);
            if (!latest)
                return null;
            return plainToInstance(AirQualityReadingResponseDto, latest, { excludeExtraneousValues: true });
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to fetch latest reading for station ${stationId}: ${msg}`);
            throw new InternalServerErrorException('Failed to retrieve latest reading.');
        }
    }
    /* ----------------- DATA ANALYSIS ----------------- */
    async getAveragePollutionByCity(city) {
        try {
            return await this.airQualityRepo.aggregateByCity(city);
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to calculate averages for city ${city}: ${msg}`);
            throw new InternalServerErrorException('Failed to calculate averages.');
        }
    }
    async getHazardousReadings(city) {
        try {
            const readings = await this.airQualityRepo.findAll({ city });
            const hazardous = readings.filter((r) => r.pm25 > 25 || r.pm10 > 50);
            return plainToInstance(AirQualityReadingResponseDto, hazardous, { excludeExtraneousValues: true });
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to fetch hazardous readings for city ${city}: ${msg}`);
            throw new InternalServerErrorException('Failed to fetch hazardous readings.');
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