var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var OpenAQService_1;
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { StationRepository } from '../stations/station.repository.js';
import { StationService } from '../stations/station.service.js';
import { AirQualityService } from '../air-quality/air-quality.service.js';
let OpenAQService = OpenAQService_1 = class OpenAQService {
    stationRepo;
    stationService;
    airQualityService;
    logger = new Logger(OpenAQService_1.name);
    baseUrl = 'https://api.openaq.org/v3';
    constructor(stationRepo, stationService, airQualityService) {
        this.stationRepo = stationRepo;
        this.stationService = stationService;
        this.airQualityService = airQualityService;
    }
    /** Sync parameters from OpenAQ */
    async syncParameters(params) {
        this.logger.log(`Syncing ${params.length} OpenAQ parameters...`);
        try {
            const results = [];
            for (const param of params) {
                const res = await axios.get(`${this.baseUrl}/parameters`, { params: param });
                results.push(...res.data.results);
            }
            return { success: true, parametersSynced: results.length, data: results };
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to sync parameters: ${msg}`);
            throw error;
        }
    }
    /** Sync measurements from OpenAQ */
    async syncMeasurements(measurements) {
        this.logger.log(`Syncing ${measurements.length} OpenAQ measurements...`);
        try {
            const results = [];
            for (const measurement of measurements) {
                const res = await axios.get(`${this.baseUrl}/measurements`, { params: measurement });
                results.push(...res.data.results);
                // Save each measurement to the database
                for (const m of res.data.results) {
                    const station = await this.stationService.findByExternalId(m.locationId?.toString());
                    if (!station)
                        continue;
                    await this.airQualityService.createReading(station.id, {
                        pm25: m.parameter === 'pm25' ? m.value : 0,
                        pm10: m.parameter === 'pm10' ? m.value : 0,
                        co: m.parameter === 'co' ? m.value : null,
                        no2: m.parameter === 'no2' ? m.value : null,
                        o3: m.parameter === 'o3' ? m.value : null,
                    }, 'openaq');
                }
            }
            return { success: true, measurementsSynced: results.length, data: results };
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to sync measurements: ${msg}`);
            throw error;
        }
    }
    /** Full sync of parameters + measurements */
    async fullOpenAQSync(data) {
        this.logger.log(`Starting full OpenAQ sync...`);
        await this.syncParameters(data.parameters);
        await this.syncMeasurements(data.measurements);
        this.logger.log(`✅ Full OpenAQ sync completed`);
        return { success: true };
    }
};
OpenAQService = OpenAQService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [StationRepository,
        StationService,
        AirQualityService])
], OpenAQService);
export { OpenAQService };
//# sourceMappingURL=openaq.service.js.map