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
var OpenAQService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAQService = void 0;
const common_1 = require("@nestjs/common");
const station_service_js_1 = require("../stations/station.service.js");
const air_quality_service_js_1 = require("../air-quality/air-quality.service.js");
const prisma_service_js_1 = require("../prisma/prisma.service.js");
let OpenAQService = OpenAQService_1 = class OpenAQService {
    stationService;
    airQualityService;
    prisma;
    logger = new common_1.Logger(OpenAQService_1.name);
    constructor(stationService, airQualityService, prisma) {
        this.stationService = stationService;
        this.airQualityService = airQualityService;
        this.prisma = prisma;
    }
    async findStationByNameAndCity(name, city) {
        return this.stationService.findByNameAndCity(name, city);
    }
    async syncParameters(params) {
        this.logger.log(`Processing ${params.length} OpenAQ parameters for local storage...`);
        try {
            const upsertedParameters = [];
            for (const p of params) {
                const upserted = await this.prisma.openAQParameter.upsert({
                    where: { id: p.id },
                    update: {
                        name: p.name,
                        displayName: p.displayName,
                        units: p.units,
                        description: p.description,
                    },
                    create: {
                        id: p.id,
                        name: p.name,
                        displayName: p.displayName,
                        units: p.units,
                        description: p.description,
                    },
                });
                upsertedParameters.push(upserted);
            }
            this.logger.log(`Successfully processed ${upsertedParameters.length} OpenAQ parameters.`);
            return { success: true, parametersProcessed: upsertedParameters.length, data: upsertedParameters };
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to process OpenAQ parameters for local storage: ${msg}`);
            throw error;
        }
    }
    async syncMeasurements(measurements) {
        this.logger.log(`Processing ${measurements.length} OpenAQ measurements for local storage...`);
        try {
            // Fetch all parameters once to map names to IDs
            const parameters = await this.prisma.openAQParameter.findMany();
            const parameterNameToId = parameters.reduce((acc, p) => {
                acc[p.name] = p.id;
                return acc;
            }, {});
            // Group measurements by stationId to process them in batches
            const measurementsByStation = measurements.reduce((acc, m) => {
                (acc[m.stationId] = acc[m.stationId] || []).push(m);
                return acc;
            }, {});
            let totalProcessedCount = 0;
            for (const stationId in measurementsByStation) {
                const station = await this.stationService.findByExternalId(stationId);
                if (!station) {
                    this.logger.warn(`Skipping measurements for unknown OpenAQ station ID: ${stationId}`);
                    continue;
                }
                const stationMeasurements = measurementsByStation[stationId];
                // Assuming all measurements for a station in a single sync batch share a timestamp
                // and can be consolidated into one AirQuality record.
                const airQualityData = {
                    pm25: stationMeasurements.find(m => m.parameterId === parameterNameToId['pm25'])?.value ?? 0,
                    pm10: stationMeasurements.find(m => m.parameterId === parameterNameToId['pm10'])?.value ?? 0,
                    co: stationMeasurements.find(m => m.parameterId === parameterNameToId['co'])?.value ?? null,
                    no2: stationMeasurements.find(m => m.parameterId === parameterNameToId['no2'])?.value ?? null,
                    o3: stationMeasurements.find(m => m.parameterId === parameterNameToId['o3'])?.value ?? null,
                };
                // The original logic created a new reading for each parameter. This new logic
                // creates one reading with all parameters for a given station and time.
                await this.airQualityService.createReading(station.id, airQualityData, 'openaq');
                totalProcessedCount += stationMeasurements.length;
            }
            this.logger.log(`Successfully processed ${totalProcessedCount} OpenAQ measurements.`);
            return { success: true, measurementsProcessed: totalProcessedCount };
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to process OpenAQ measurements for local storage: ${msg}`);
            throw error;
        }
    }
    async fullOpenAQSync(data) {
        this.logger.log(`Starting full OpenAQ sync (processing incoming data)...`);
        const parameters = data?.parameters ?? [];
        const measurements = data?.measurements ?? [];
        await this.syncParameters(parameters);
        await this.syncMeasurements(measurements);
        this.logger.log(`✅ Full OpenAQ sync (processing incoming data) completed`);
        return { success: true };
    }
};
exports.OpenAQService = OpenAQService;
exports.OpenAQService = OpenAQService = OpenAQService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [station_service_js_1.StationService,
        air_quality_service_js_1.AirQualityService,
        prisma_service_js_1.PrismaService])
], OpenAQService);
//# sourceMappingURL=openaq.service.js.map