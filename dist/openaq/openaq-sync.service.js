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
import axios from 'axios';
import { StationService } from '../stations/station.service.js';
import { AirQualityService } from '../air-quality/air-quality.service.js';
let OpenAQSyncService = OpenAQSyncService_1 = class OpenAQSyncService {
    stationService;
    airQualityService;
    logger = new Logger(OpenAQSyncService_1.name);
    baseUrl = 'https://api.openaq.org/v2';
    pageLimit = 100;
    constructor(stationService, airQualityService) {
        this.stationService = stationService;
        this.airQualityService = airQualityService;
    }
    /* ----------------- CRON JOB ----------------- */
    async syncOpenAQ() {
        this.logger.log('🔄 Starting OpenAQ sync...');
        try {
            await this.syncStations();
            await this.syncLatestMeasurements();
            this.logger.log('✅ OpenAQ sync completed successfully.');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`❌ OpenAQ sync failed. Error: ${errorMessage}`);
        }
    }
    /* ----------------- STATIONS ----------------- */
    async syncStations() {
        this.logger.log('📡 Syncing OpenAQ stations...');
        let page = 1;
        let fetched = 0;
        do {
            const res = await axios.get(`${this.baseUrl}/locations`, {
                params: { limit: this.pageLimit, page },
            });
            const stations = res.data?.results || [];
            fetched = stations.length;
            for (const s of stations) {
                try {
                    await this.stationService.upsertFromOpenAQ({
                        externalId: s.id.toString(),
                        name: s.name,
                        city: s.city ?? 'Unknown',
                        country: s.country ?? 'Unknown',
                        latitude: s.coordinates?.latitude ?? 0,
                        longitude: s.coordinates?.longitude ?? 0,
                    });
                    this.logger.log(`✅ Station synced: ${s.name} (${s.city})`);
                }
                catch (err) {
                    this.logger.error(`Failed to sync station ${s.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
                }
            }
            page++;
        } while (fetched === this.pageLimit);
    }
    /* ----------------- PARAMETERS + MEASUREMENTS ----------------- */
    async syncLatestMeasurements() {
        this.logger.log('📊 Syncing latest OpenAQ measurements...');
        const syncedStations = await this.stationService.getAllStations();
        const openaqStations = syncedStations.filter(s => s.source === 'openaq' && s.externalId);
        this.logger.log(`Found ${openaqStations.length} OpenAQ stations to sync measurements for.`);
        for (const station of openaqStations) {
            try {
                const res = await axios.get(`${this.baseUrl}/latest`, {
                    params: { location_id: station.externalId },
                });
                const measurements = res.data?.results[0]?.measurements || [];
                if (measurements.length === 0)
                    continue;
                this.logger.log(`Found ${measurements.length} new measurements for station: ${station.name}`);
                for (const m of measurements) {
                    await this.airQualityService.createReading(station.id, {
                        pm25: m.parameter === 'pm25' ? m.value : 0, // Assuming 0 if not present
                        pm10: m.parameter === 'pm10' ? m.value : 0, // Assuming 0 if not present
                        co: m.parameter === 'co' ? m.value : null,
                        no2: m.parameter === 'no2' ? m.value : null,
                        o3: m.parameter === 'o3' ? m.value : null,
                    }, 'openaq');
                }
            }
            catch (err) {
                this.logger.error(`Failed to sync measurements for station ${station.name} (${station.externalId}): ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
        }
        this.logger.log('✅ Measurements sync process completed.');
    }
};
__decorate([
    Cron(CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OpenAQSyncService.prototype, "syncOpenAQ", null);
OpenAQSyncService = OpenAQSyncService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [StationService,
        AirQualityService])
], OpenAQSyncService);
export { OpenAQSyncService };
//# sourceMappingURL=openaq-sync.service.js.map