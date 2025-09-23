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
    baseUrl = 'https://api.openaq.org/v2'; // OpenAQ API base URL
    pageLimit = 100; // pagination limit
    constructor(stationService, // service for Station table
    airQualityService) {
        this.stationService = stationService;
        this.airQualityService = airQualityService;
    }
    /* ----------------- CRON JOB ----------------- */
    // Runs every hour
    async syncOpenAQ() {
        this.logger.log('🔄 Starting OpenAQ sync...');
        try {
            await this.syncStations();
            await this.syncParametersAndMeasurements();
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
                    await this.stationService.createOrUpdateFromOpenAQ({
                        openaqStationId: s.id.toString(),
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
        } while (fetched === this.pageLimit); // loop until last page
    }
    /* ----------------- PARAMETERS + MEASUREMENTS ----------------- */
    async syncParametersAndMeasurements() {
        this.logger.log('📊 Syncing OpenAQ parameters and latest measurements...');
        let page = 1;
        let fetched = 0;
        do {
            const res = await axios.get(`${this.baseUrl}/measurements`, {
                params: { limit: this.pageLimit, page },
            });
            const measurements = res.data?.results || [];
            fetched = measurements.length;
            for (const m of measurements) {
                try {
                    // Upsert parameter
                    await this.airQualityService.upsertParameter({
                        id: m.parameter_id,
                        name: m.parameter,
                        displayName: m.parameter,
                        units: m.unit,
                        description: m.parameter, // OpenAQ does not always provide description
                    });
                    // Map to local station
                    const station = await this.stationService.findByOpenAQId(m.location_id.toString());
                    if (!station)
                        continue; // skip if station not synced yet
                    // Create air quality reading
                    await this.airQualityService.createReading(station.id, {
                        pm25: m.parameter === 'pm25' ? m.value : 0,
                        pm10: m.parameter === 'pm10' ? m.value : 0,
                        co: m.parameter === 'co' ? m.value : null,
                        no2: m.parameter === 'no2' ? m.value : null,
                        o3: m.parameter === 'o3' ? m.value : null,
                    });
                    this.logger.log(`✅ Measurement synced for station: ${station.name}, parameter: ${m.parameter}`);
                }
                catch (err) {
                    this.logger.error(`Failed to sync measurement for location ${m.location_id}: ${err instanceof Error ? err.message : 'Unknown error'}`);
                }
            }
            page++;
        } while (fetched === this.pageLimit); // loop until last page
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