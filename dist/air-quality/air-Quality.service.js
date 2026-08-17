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
var AirQualityService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AirQualityService = void 0;
const common_1 = require("@nestjs/common");
const class_transformer_1 = require("class-transformer");
const class_validator_1 = require("class-validator");
const air_quality_response_dto_js_1 = require("./dto/air-quality-response.dto.js");
const create_reading_dto_js_1 = require("./dto/create-reading.dto.js");
const station_repository_js_1 = require("../stations/station.repository.js");
const air_quality_repository_js_1 = require("./air-quality.repository.js");
const audit_log_service_js_1 = require("../common/audit/audit-log.service.js");
let AirQualityService = class AirQualityService {
    static { AirQualityService_1 = this; }
    airQualityRepo;
    stationRepo;
    auditLog;
    logger = new common_1.Logger(AirQualityService_1.name);
    static MAX_WINDOW_HOURS = 720;
    static MAX_CSV_ROWS = 1000;
    static WHO_LIMITS_UGM3 = {
        pm25: 15,
        pm10: 45,
        no2: 25,
        so2: 40,
        o3: 100,
        co: 4000,
    };
    constructor(airQualityRepo, stationRepo, auditLog) {
        this.airQualityRepo = airQualityRepo;
        this.stationRepo = stationRepo;
        this.auditLog = auditLog;
    }
    /* ----------------- DATA CREATION ----------------- */
    async createReading(stationId, data, source = 'local', userId, measuredAt) {
        try {
            const station = await this.stationRepo.findById(stationId);
            if (!station)
                throw new common_1.NotFoundException(`Station with ID ${stationId} not found`);
            const { pm25, pm10, co, no2, o3, so2 } = data;
            const createdReading = await this.airQualityRepo.create({
                stationId,
                pm25: pm25 ?? null,
                pm10: pm10 ?? null,
                co,
                no2,
                o3,
                so2,
                source,
                measuredAt: measuredAt ?? null,
                instrumentModel: data.instrumentModel ?? null,
                calibrationDate: data.calibrationDate ?? null,
                samplingDurationMinutes: data.samplingDurationMinutes ?? null,
                weatherConditions: data.weatherConditions ?? null,
                temperature: data.temperature ?? null,
                humidity: data.humidity ?? null,
                isSuspect: false,
                suspectReason: null,
            });
            if (source === 'local') {
                await this.auditLog.log({
                    userId: userId ?? 'public',
                    action: 'create',
                    resource: 'AirQuality',
                    resourceId: createdReading.id,
                    changes: { ...data, measuredAt: measuredAt ?? null },
                });
            }
            return (0, class_transformer_1.plainToInstance)(air_quality_response_dto_js_1.AirQualityReadingResponseDto, createdReading, { excludeExtraneousValues: true });
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            const msg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to create reading: ${msg}`);
            throw new common_1.InternalServerErrorException('Failed to create reading.');
        }
    }
    async setSuspectFlag(id, isSuspect, suspectReason, userId) {
        try {
            const existing = await this.airQualityRepo.findById(id);
            if (!existing)
                throw new common_1.NotFoundException(`Reading with ID ${id} not found`);
            const updated = await this.airQualityRepo.update(id, { isSuspect, suspectReason });
            await this.auditLog.log({
                userId,
                action: 'flag_suspect',
                resource: 'AirQuality',
                resourceId: id,
                changes: { isSuspect, suspectReason },
            });
            return (0, class_transformer_1.plainToInstance)(air_quality_response_dto_js_1.AirQualityReadingResponseDto, updated, { excludeExtraneousValues: true });
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException)
                throw error;
            const msg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to set suspect flag for reading ${id}: ${msg}`);
            throw new common_1.InternalServerErrorException('Failed to update suspect flag.');
        }
    }
    /* ----------------- DATA RETRIEVAL ----------------- */
    async getReadingsByStation(stationId) {
        try {
            const readings = await this.airQualityRepo.findAll({ stationId });
            return (0, class_transformer_1.plainToInstance)(air_quality_response_dto_js_1.AirQualityReadingResponseDto, readings, { excludeExtraneousValues: true });
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to fetch readings for station ${stationId}: ${msg}`);
            throw new common_1.InternalServerErrorException('Failed to retrieve readings for station.');
        }
    }
    async getReadingsByCity(city) {
        try {
            const readings = await this.airQualityRepo.findAll({ city });
            return (0, class_transformer_1.plainToInstance)(air_quality_response_dto_js_1.AirQualityReadingResponseDto, readings, { excludeExtraneousValues: true });
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to fetch readings for city ${city}: ${msg}`);
            throw new common_1.InternalServerErrorException('Failed to retrieve readings for city.');
        }
    }
    async getLatestReadingByStation(stationId) {
        try {
            const latest = await this.airQualityRepo.findLatestByStation(stationId);
            if (!latest)
                return null;
            return (0, class_transformer_1.plainToInstance)(air_quality_response_dto_js_1.AirQualityReadingResponseDto, latest, { excludeExtraneousValues: true });
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to fetch latest reading for station ${stationId}: ${msg}`);
            throw new common_1.InternalServerErrorException('Failed to retrieve latest reading.');
        }
    }
    /* ----------------- DATA ANALYSIS ----------------- */
    async getAveragePollutionByCity(city, hours = 24) {
        const safeHours = Math.min(hours, AirQualityService_1.MAX_WINDOW_HOURS);
        const since = new Date(Date.now() - safeHours * 60 * 60 * 1000);
        try {
            const result = await this.airQualityRepo.aggregateByCity(city, since);
            return {
                city,
                windowHours: safeHours,
                average: result._avg,
                sampleCount: result._count,
            };
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to calculate averages for city ${city}: ${msg}`);
            throw new common_1.InternalServerErrorException('Failed to calculate averages.');
        }
    }
    async getHazardousReadings(city, hours = 24) {
        const safeHours = Math.min(hours, AirQualityService_1.MAX_WINDOW_HOURS);
        const since = new Date(Date.now() - safeHours * 60 * 60 * 1000);
        try {
            const readings = await this.airQualityRepo.findAll({ city, since });
            const withExceedances = readings.map((r) => {
                const exceedances = [];
                for (const [pollutant, limit] of Object.entries(AirQualityService_1.WHO_LIMITS_UGM3)) {
                    const value = r[pollutant];
                    if (value !== null && value !== undefined && value > limit) {
                        exceedances.push({ pollutant, value, limit, factor: Math.round((value / limit) * 10) / 10 });
                    }
                }
                return { reading: r, exceedances };
            });
            const hazardous = withExceedances.filter((x) => x.exceedances.length > 0);
            return hazardous.map((x) => ({
                ...(0, class_transformer_1.plainToInstance)(air_quality_response_dto_js_1.AirQualityReadingResponseDto, x.reading, { excludeExtraneousValues: true }),
                stationName: x.reading.station.name,
                exceedances: x.exceedances,
            }));
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to fetch hazardous readings for city ${city}: ${msg}`);
            throw new common_1.InternalServerErrorException('Failed to fetch hazardous readings.');
        }
    }
    static DUPLICATE_WINDOW_MS = 60_000;
    async findDuplicates(city, hours = 24) {
        const safeHours = Math.min(hours, AirQualityService_1.MAX_WINDOW_HOURS);
        const since = new Date(Date.now() - safeHours * 60 * 60 * 1000);
        try {
            const readings = await this.airQualityRepo.findAll({ city, since });
            const groups = new Map();
            for (const r of readings) {
                const key = `${r.stationId}|${r.pm25}|${r.pm10}|${r.co}|${r.no2}|${r.o3}|${r.so2}`;
                const group = groups.get(key) ?? [];
                group.push(r);
                groups.set(key, group);
            }
            const duplicates = [];
            for (const group of groups.values()) {
                if (group.length < 2)
                    continue;
                const times = group.map((r) => (r.measuredAt ?? r.createdAt).getTime());
                const span = Math.max(...times) - Math.min(...times);
                if (span > AirQualityService_1.DUPLICATE_WINDOW_MS)
                    continue;
                const [first] = group;
                duplicates.push({
                    stationId: first.stationId,
                    pollutants: { pm25: first.pm25, pm10: first.pm10, co: first.co, no2: first.no2, o3: first.o3, so2: first.so2 },
                    readingIds: group.map((r) => r.id),
                    count: group.length,
                });
            }
            return duplicates;
        }
        catch (error) {
            const msg = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to find duplicates for city ${city}: ${msg}`);
            throw new common_1.InternalServerErrorException('Failed to find duplicate readings.');
        }
    }
    async bulkUploadFromCsv(rows, userId) {
        if (rows.length > AirQualityService_1.MAX_CSV_ROWS) {
            throw new common_1.BadRequestException(`CSV has ${rows.length} rows, exceeding the maximum of ${AirQualityService_1.MAX_CSV_ROWS}`);
        }
        const errors = [];
        let inserted = 0;
        for (let i = 0; i < rows.length; i++) {
            const rowNumber = i + 2; // +1 for 0-index, +1 for the header row
            const raw = rows[i];
            try {
                const stationId = Number(raw.stationId);
                if (!Number.isInteger(stationId) || stationId < 1) {
                    throw new Error(`Invalid stationId "${raw.stationId}"`);
                }
                if (!raw.measuredAt) {
                    throw new Error('measuredAt is required');
                }
                const measuredAt = new Date(raw.measuredAt);
                if (Number.isNaN(measuredAt.getTime())) {
                    throw new Error(`Invalid measuredAt "${raw.measuredAt}"`);
                }
                if (measuredAt.getTime() > Date.now()) {
                    throw new Error(`measuredAt "${raw.measuredAt}" is in the future`);
                }
                if (measuredAt.getFullYear() < 1970) {
                    throw new Error(`measuredAt "${raw.measuredAt}" is implausibly old`);
                }
                const dto = (0, class_transformer_1.plainToInstance)(create_reading_dto_js_1.CreateAirQualityDto, {
                    pm25: raw.pm25 ? Number(raw.pm25) : undefined,
                    pm10: raw.pm10 ? Number(raw.pm10) : undefined,
                    co: raw.co ? Number(raw.co) : undefined,
                    no2: raw.no2 ? Number(raw.no2) : undefined,
                    o3: raw.o3 ? Number(raw.o3) : undefined,
                    so2: raw.so2 ? Number(raw.so2) : undefined,
                    instrumentModel: raw.instrumentModel || undefined,
                    calibrationDate: raw.calibrationDate || undefined,
                    samplingDurationMinutes: raw.samplingDurationMinutes ? Number(raw.samplingDurationMinutes) : undefined,
                    weatherConditions: raw.weatherConditions || undefined,
                    temperature: raw.temperature ? Number(raw.temperature) : undefined,
                    humidity: raw.humidity ? Number(raw.humidity) : undefined,
                });
                const validationErrors = await (0, class_validator_1.validate)(dto);
                if (validationErrors.length > 0) {
                    const message = validationErrors
                        .map((e) => Object.values(e.constraints ?? {}).join(', '))
                        .join('; ');
                    throw new Error(message);
                }
                await this.createReading(stationId, {
                    pm25: dto.pm25 ?? null,
                    pm10: dto.pm10 ?? null,
                    co: dto.co ?? null,
                    no2: dto.no2 ?? null,
                    o3: dto.o3 ?? null,
                    so2: dto.so2 ?? null,
                    instrumentModel: dto.instrumentModel ?? null,
                    calibrationDate: dto.calibrationDate ? new Date(dto.calibrationDate) : null,
                    samplingDurationMinutes: dto.samplingDurationMinutes ?? null,
                    weatherConditions: dto.weatherConditions ?? null,
                    temperature: dto.temperature ?? null,
                    humidity: dto.humidity ?? null,
                }, 'local', userId, measuredAt);
                inserted++;
            }
            catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                errors.push({ row: rowNumber, message });
            }
        }
        return { inserted, errors };
    }
};
exports.AirQualityService = AirQualityService;
exports.AirQualityService = AirQualityService = AirQualityService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [air_quality_repository_js_1.AirQualityRepository,
        station_repository_js_1.StationRepository,
        audit_log_service_js_1.AuditLogService])
], AirQualityService);
//# sourceMappingURL=air-quality.service.js.map