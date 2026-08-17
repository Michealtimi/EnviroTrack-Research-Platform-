"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAQSyncService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const axios_1 = require("@nestjs/axios");
const rxjs_1 = require("rxjs");
const config_1 = require("@nestjs/config");
const station_service_js_1 = require("../stations/station.service.js");
const air_quality_service_js_1 = require("../air-quality/air-quality.service.js");
const prisma_service_js_1 = require("../prisma/prisma.service.js");
let OpenAQSyncService = OpenAQSyncService_1 = class OpenAQSyncService {
    stationService;
    airQualityService;
    configService;
    httpService;
    prisma;
    logger = new common_1.Logger(OpenAQSyncService_1.name);
    baseUrl = 'https://api.openaq.org/v3';
    apiKey;
    pageLimit = 100;
    maxLocations;
    countryIso;
    constructor(stationService, airQualityService, configService, httpService, prisma) {
        this.stationService = stationService;
        this.airQualityService = airQualityService;
        this.configService = configService;
        this.httpService = httpService;
        this.prisma = prisma;
        this.apiKey = this.configService.get('OPENAQ_API_KEY') ?? '';
        this.maxLocations = Number(this.configService.get('OPENAQ_SYNC_MAX_LOCATIONS')) || 50;
        this.countryIso = this.configService.get('OPENAQ_SYNC_COUNTRY_ISO') || undefined;
    }
    async writeSyncLog(resource, status, details) {
        try {
            await this.prisma.openAQSyncLog.create({ data: { resource, status, details: details } });
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to write OpenAQSyncLog entry for ${resource}: ${msg}`);
        }
    }
    async syncOpenAQ() {
        this.logger.log('🔄 Starting OpenAQ v3 sync...');
        try {
            const sensorParameterMap = await this.syncStations();
            await this.syncLatestMeasurements(sensorParameterMap);
            this.logger.log('✅ OpenAQ sync completed successfully.');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`❌ OpenAQ sync failed. Error: ${errorMessage}`);
        }
    }
    // ponytail: v1 caps sync to `maxLocations` (optionally one country) to stay inside the
    // free-tier rate limit. Raise/drop the cap once on a paid key or full coverage is needed.
    async syncStations() {
        const start = Date.now();
        this.logger.log('📡 Syncing OpenAQ locations (v3)...');
        const sensorParameterMap = new Map();
        let page = 1;
        let synced = 0;
        let failed = 0;
        try {
            while (synced < this.maxLocations) {
                const res = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.baseUrl}/locations`, {
                    params: {
                        limit: Math.min(this.pageLimit, this.maxLocations - synced),
                        page,
                        ...(this.countryIso && { iso: this.countryIso }),
                    },
                    headers: { 'X-API-Key': this.apiKey },
                }));
                const locations = res.data?.results ?? [];
                if (locations.length === 0)
                    break;
                for (const loc of locations) {
                    if (synced >= this.maxLocations)
                        break;
                    try {
                        await this.stationService.upsertFromOpenAQ({
                            externalId: loc.id.toString(),
                            name: loc.name,
                            city: loc.locality ?? loc.country?.name ?? 'Unknown',
                            country: loc.country?.name ?? loc.country?.code ?? 'Unknown',
                            latitude: loc.coordinates?.latitude ?? 0,
                            longitude: loc.coordinates?.longitude ?? 0,
                        });
                        for (const sensor of loc.sensors ?? []) {
                            if (sensor.parameter?.name)
                                sensorParameterMap.set(sensor.id, sensor.parameter.name);
                        }
                        synced++;
                    }
                    catch (err) {
                        failed++;
                        this.logger.error(`Failed to sync location ${loc.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
                    }
                }
                page++;
            }
            this.logger.log(`✅ Synced ${synced} OpenAQ locations.`);
            await this.writeSyncLog('stations', 'success', { synced, failed, durationMs: Date.now() - start });
            return sensorParameterMap;
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            await this.writeSyncLog('stations', 'failed', { synced, failed, durationMs: Date.now() - start, error: msg });
            throw error;
        }
    }
    async syncLatestMeasurements(sensorParameterMap) {
        const start = Date.now();
        this.logger.log('📊 Syncing latest OpenAQ measurements (v3)...');
        let synced = 0;
        let failed = 0;
        try {
            const syncedStations = await this.stationService.getAllStations();
            const openaqStations = syncedStations.filter((s) => s.source === 'openaq' && s.externalId);
            for (const station of openaqStations) {
                try {
                    const res = await (0, rxjs_1.firstValueFrom)(this.httpService.get(`${this.baseUrl}/locations/${station.externalId}/latest`, { headers: { 'X-API-Key': this.apiKey } }));
                    const results = res.data?.results ?? [];
                    if (results.length === 0)
                        continue;
                    const reading = {
                        pm25: null, pm10: null, co: null, no2: null, o3: null, so2: null,
                    };
                    let matched = false;
                    for (const r of results) {
                        const paramName = sensorParameterMap.get(r.sensorsId);
                        if (paramName && paramName in reading) {
                            reading[paramName] = r.value;
                            matched = true;
                        }
                    }
                    if (!matched) {
                        this.logger.warn(`No known pollutant matched for station ${station.name} (${station.externalId}) - ${results.length} sensor reading(s) returned but none mapped to a tracked parameter. Skipping empty reading.`);
                        continue;
                    }
                    await this.airQualityService.createReading(station.id, reading, 'openaq');
                    synced++;
                }
                catch (err) {
                    failed++;
                    this.logger.error(`Failed to sync measurements for station ${station.name} (${station.externalId}): ${err instanceof Error ? err.message : 'Unknown error'}`);
                }
            }
            this.logger.log('✅ Measurements sync process completed.');
            await this.writeSyncLog('measurements', 'success', { synced, failed, durationMs: Date.now() - start });
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            await this.writeSyncLog('measurements', 'failed', { synced, failed, durationMs: Date.now() - start, error: msg });
            throw error;
        }
    }
};
exports.OpenAQSyncService = OpenAQSyncService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OpenAQSyncService.prototype, "syncOpenAQ", null);
exports.OpenAQSyncService = OpenAQSyncService = OpenAQSyncService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [station_service_js_1.StationService,
        air_quality_service_js_1.AirQualityService,
        config_1.ConfigService,
        axios_1.HttpService,
        prisma_service_js_1.PrismaService])
], OpenAQSyncService);
//# sourceMappingURL=openaq-sync.service.js.map