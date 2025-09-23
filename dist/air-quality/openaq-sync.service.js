var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var OpenAQSyncService_1;
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AirQualityService } from './air-quality.service.js';
import fetch from 'node-fetch';
let OpenAQSyncService = OpenAQSyncService_1 = class OpenAQSyncService {
    airQualityService;
    logger = new Logger(OpenAQSyncService_1.name);
    constructor(airQualityService) {
        this.airQualityService = airQualityService;
    }
    // Cron job runs every hour (can adjust)
    async handleOpenAQSync() {
        this.logger.log('Starting OpenAQ sync via Cron job...');
        try {
            // 1️⃣ Fetch parameters from OpenAQ API
            const paramResponse = await fetch('https://api.openaq.org/v2/parameters');
            const paramData = await paramResponse.json();
            const parameters = paramData.results.map((p) => ({
                id: p.id,
                name: p.name,
                displayName: p.displayName,
                units: p.unit,
                description: p.description,
            }));
            // 2️⃣ Fetch latest measurements from OpenAQ API
            const measurementResponse = await fetch('https://api.openaq.org/v2/latest?limit=10000');
            const measurementData = await measurementResponse.json();
            const measurements = [];
            // Map OpenAQ stations to your local Station table
            for (const record of measurementData.results) {
                const station = await this.airQualityService['stationRepo'].findByNameAndCity(record.location, record.city);
                if (!station)
                    continue;
                for (const m of record.measurements) {
                    measurements.push({
                        stationId: station.id,
                        parameterId: m.parameterId, // Assumes OpenAQ parameter IDs match your DB
                        value: m.value,
                        dateUtc: m.lastUpdated,
                    });
                }
            }
            // 3️⃣ Perform full sync
            await this.airQualityService.fullOpenAQSync({ parameters, measurements });
            this.logger.log('OpenAQ sync completed successfully.');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`OpenAQ sync failed. Error: ${errorMessage}`);
        }
    }
};
__decorate([
    Cron(CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OpenAQSyncService.prototype, "handleOpenAQSync", null);
OpenAQSyncService = OpenAQSyncService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [AirQualityService])
], OpenAQSyncService);
export { OpenAQSyncService };
//# sourceMappingURL=openaq-sync.service.js.map