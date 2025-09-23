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
// src/openaq/openaq.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule'; // For scheduling cron jobs
import axios from 'axios'; // HTTP client for calling OpenAQ API
import { StationRepository } from '../stations/station.repository.js';
import { AirQualityService } from '../air-quality/air-quality.service.js';
let OpenAQService = OpenAQService_1 = class OpenAQService {
    stationRepo;
    airQualityService;
    logger = new Logger(OpenAQService_1.name);
    baseUrl = 'https://api.openaq.org/v3'; // OpenAQ v3 API
    constructor(stationRepo, // Existing repository
    airQualityService) {
        this.stationRepo = stationRepo;
        this.airQualityService = airQualityService;
    }
    /* -----------------------------
       🔹 Stage 1: Sync Stations
    ----------------------------- */
    async syncStations() {
        this.logger.log('🔄 Starting OpenAQ stations sync...');
        try {
            let page = 1;
            let totalResults = 0;
            while (true) {
                const res = await axios.get(`${this.baseUrl}/locations`, {
                    params: { page, limit: 100 }, // pagination
                });
                const stations = res.data.results;
                if (!stations || stations.length === 0)
                    break; // stop when no more data
                for (const s of stations) {
                    await this.stationRepo.upsertFromOpenAQ({
                        openaqStationId: s.id.toString(),
                        name: s.name,
                        city: s.city ?? 'Unknown',
                        country: s.country ?? 'Unknown',
                        latitude: s.coordinates?.latitude ?? 0,
                        longitude: s.coordinates?.longitude ?? 0,
                    });
                    totalResults++;
                }
                page++;
            }
            this.logger.log(`✅ OpenAQ stations sync completed. Total stations synced: ${totalResults}`);
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`❌ OpenAQ stations sync failed. Error: ${msg}`);
        }
    }
    /* -----------------------------
       🔹 Stage 2: Sync Parameters
    ----------------------------- */
    async syncParameters() {
        this.logger.log('🔄 Starting OpenAQ parameters sync...');
        try {
            const res = await axios.get(`${this.baseUrl}/parameters`);
            const parameters = res.data.results;
            // Loop through each parameter
            for (const p of parameters) {
                await this.airQualityService.upsertParameter({
                    id: p.id,
                    name: p.name,
                    displayName: p.displayName,
                    units: p.units,
                    description: p.description ?? '',
                });
            }
            this.logger.log(`✅ OpenAQ parameters sync completed. Total parameters: ${parameters.length}`);
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`❌ OpenAQ parameters sync failed. Error: ${msg}`);
        }
    }
    /* -----------------------------
       🔹 Stage 3: Sync Measurements
    ----------------------------- */
    async syncMeasurements() {
        this.logger.log('🔄 Starting OpenAQ measurements sync...');
        try {
            const stations = await this.stationRepo.findAll(); // Fetch all synced stations
            for (const station of stations) {
                if (!station.openaqStationId)
                    continue; // skip local-only stations
                const res = await axios.get(`${this.baseUrl}/latest`, {
                    params: { location_id: station.openaqStationId },
                });
                const measurements = res.data.results[0]?.measurements ?? [];
                for (const m of measurements) {
                    await this.airQualityService.createReading(station.id, {
                        pm25: m.parameter === 'pm25' ? m.value : 0,
                        pm10: m.parameter === 'pm10' ? m.value : 0,
                        co: m.parameter === 'co' ? m.value : null,
                        no2: m.parameter === 'no2' ? m.value : null,
                        o3: m.parameter === 'o3' ? m.value : null,
                    });
                }
            }
            this.logger.log(`✅ OpenAQ measurements sync completed.`);
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`❌ OpenAQ measurements sync failed. Error: ${msg}`);
        }
    }
};
__decorate([
    Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT) // Runs daily at midnight
    ,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OpenAQService.prototype, "syncStations", null);
__decorate([
    Cron(CronExpression.EVERY_DAY_AT_1AM) // Run after stations sync
    ,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OpenAQService.prototype, "syncParameters", null);
__decorate([
    Cron(CronExpression.EVERY_30_MINUTES) // Frequent sync for latest measurements
    ,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OpenAQService.prototype, "syncMeasurements", null);
OpenAQService = OpenAQService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [StationRepository,
        AirQualityService])
], OpenAQService);
export { OpenAQService };
//# sourceMappingURL=openaq.service.js.map