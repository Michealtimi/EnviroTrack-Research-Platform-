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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AirQualityController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AirQualityController = void 0;
// src/air-quality/air-quality.controller.ts
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const platform_express_1 = require("@nestjs/platform-express");
const swagger_1 = require("@nestjs/swagger");
const sync_1 = require("csv-parse/sync");
const create_reading_dto_js_1 = require("./dto/create-reading.dto.js");
const air_quality_response_dto_js_1 = require("./dto/air-quality-response.dto.js");
const set_suspect_dto_js_1 = require("./dto/set-suspect.dto.js");
const air_quality_service_js_1 = require("./air-quality.service.js");
const api_key_guard_js_1 = require("../common/guards/api-key.guard.js");
const hazardous_csv_util_js_1 = require("./hazardous-csv.util.js");
let AirQualityController = AirQualityController_1 = class AirQualityController {
    airQualityService;
    configService;
    logger = new common_1.Logger(AirQualityController_1.name);
    constructor(airQualityService, configService) {
        this.airQualityService = airQualityService;
        this.configService = configService;
    }
    async create(stationId, body, req) {
        this.logger.log(`Request to create reading for station ID: ${stationId}`);
        const readingData = {
            pm25: body.pm25 ?? null,
            pm10: body.pm10 ?? null,
            co: body.co ?? null,
            no2: body.no2 ?? null,
            o3: body.o3 ?? null,
            so2: body.so2 ?? null,
            instrumentModel: body.instrumentModel ?? null,
            calibrationDate: body.calibrationDate ? new Date(body.calibrationDate) : null,
            samplingDurationMinutes: body.samplingDurationMinutes ?? null,
            weatherConditions: body.weatherConditions ?? null,
            temperature: body.temperature ?? null,
            humidity: body.humidity ?? null,
        };
        const userId = (0, api_key_guard_js_1.isAdminRequest)(req.headers, this.configService) ? 'admin' : 'public';
        return this.airQualityService.createReading(stationId, readingData, 'local', userId);
    }
    async bulkUpload(file, req) {
        if (!file)
            throw new common_1.BadRequestException('No file uploaded');
        let records;
        try {
            records = (0, sync_1.parse)(file.buffer, { columns: true, skip_empty_lines: true, trim: true });
        }
        catch (err) {
            throw new common_1.BadRequestException(`Could not parse CSV: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
        const userId = (0, api_key_guard_js_1.isAdminRequest)(req.headers, this.configService) ? 'admin' : 'public';
        return this.airQualityService.bulkUploadFromCsv(records, userId);
    }
    async setSuspect(id, body) {
        this.logger.log(`Request to set suspect flag on reading ${id}: ${body.isSuspect}`);
        // ApiKeyGuard already rejected this request if the key didn't match - always "admin" here.
        return this.airQualityService.setSuspectFlag(id, body.isSuspect, body.suspectReason ?? null, 'admin');
    }
    async findByStation(stationId) {
        this.logger.log(`Request to get all readings for station ID: ${stationId}`);
        return this.airQualityService.getReadingsByStation(stationId);
    }
    async findByCity(city) {
        this.logger.log(`Request to get all readings for city: ${city}`);
        return this.airQualityService.getReadingsByCity(city);
    }
    async averageByCity(city, hours) {
        this.logger.log(`Request to get average pollution for city: ${city}`);
        return this.airQualityService.getAveragePollutionByCity(city, hours);
    }
    async hazardous(city, hours, format, res) {
        this.logger.log(`Request to get hazardous readings for city: ${city}`);
        const readings = await this.airQualityService.getHazardousReadings(city, hours);
        if (format === 'csv') {
            const csv = (0, hazardous_csv_util_js_1.formatHazardousReadingsAsCsv)(readings);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="hazardous-${city}.csv"`);
            res.send(csv);
            return;
        }
        return readings;
    }
    async duplicates(city, hours) {
        this.logger.log(`Request to find duplicate readings for city: ${city}`);
        return this.airQualityService.findDuplicates(city, hours);
    }
    async latestByStation(stationId) {
        this.logger.log(`Request to get latest reading for station ID: ${stationId}`);
        return this.airQualityService.getLatestReadingByStation(stationId);
    }
};
exports.AirQualityController = AirQualityController;
__decorate([
    (0, common_1.Post)('station/:stationId'),
    (0, common_1.UseGuards)(api_key_guard_js_1.ApiKeyGuard),
    (0, swagger_1.ApiHeader)({ name: 'x-api-key', required: true, description: 'Admin API key' }),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new air quality reading for a station (requires admin API key)' }),
    (0, swagger_1.ApiBody)({ type: create_reading_dto_js_1.CreateAirQualityDto }),
    __param(0, (0, common_1.Param)('stationId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, create_reading_dto_js_1.CreateAirQualityDto, Object]),
    __metadata("design:returntype", Promise)
], AirQualityController.prototype, "create", null);
__decorate([
    (0, common_1.Post)('bulk-upload'),
    (0, common_1.UseGuards)(api_key_guard_js_1.ApiKeyGuard),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', { limits: { fileSize: 2 * 1024 * 1024 } })) // 2MB - well over 1000 rows of CSV text
    ,
    (0, swagger_1.ApiConsumes)('multipart/form-data'),
    (0, swagger_1.ApiHeader)({ name: 'x-api-key', required: true, description: 'Admin API key' }),
    (0, swagger_1.ApiBody)({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } }),
    (0, swagger_1.ApiOperation)({ summary: 'Bulk-upload readings from a CSV file (requires admin API key; columns: stationId, measuredAt required; pollutants and metadata optional)' }),
    __param(0, (0, common_1.UploadedFile)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AirQualityController.prototype, "bulkUpload", null);
__decorate([
    (0, common_1.Patch)(':id/suspect'),
    (0, common_1.UseGuards)(api_key_guard_js_1.ApiKeyGuard),
    (0, swagger_1.ApiHeader)({ name: 'x-api-key', required: true, description: 'Admin API key' }),
    (0, swagger_1.ApiOperation)({ summary: 'Flag or unflag a reading as suspect (requires admin API key)' }),
    (0, swagger_1.ApiBody)({ type: set_suspect_dto_js_1.SetSuspectDto }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, set_suspect_dto_js_1.SetSuspectDto]),
    __metadata("design:returntype", Promise)
], AirQualityController.prototype, "setSuspect", null);
__decorate([
    (0, common_1.Get)('station/:stationId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all readings by station ID' }),
    __param(0, (0, common_1.Param)('stationId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], AirQualityController.prototype, "findByStation", null);
__decorate([
    (0, common_1.Get)('city/:city'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all readings by city' }),
    __param(0, (0, common_1.Param)('city')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AirQualityController.prototype, "findByCity", null);
__decorate([
    (0, common_1.Get)('city/:city/average'),
    (0, swagger_1.ApiOperation)({ summary: 'Get average pollution by city over a recent window (default 24h)' }),
    (0, swagger_1.ApiQuery)({ name: 'hours', required: false, type: Number }),
    __param(0, (0, common_1.Param)('city')),
    __param(1, (0, common_1.Query)('hours', new common_1.ParseIntPipe({ optional: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], AirQualityController.prototype, "averageByCity", null);
__decorate([
    (0, common_1.Get)('city/:city/hazardous'),
    (0, swagger_1.ApiOperation)({ summary: 'Get hazardous readings by city over a recent window (default 24h, WHO 2021 guideline values). Add ?format=csv for a CSV download.' }),
    (0, swagger_1.ApiQuery)({ name: 'hours', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'format', required: false, description: 'Set to "csv" for a CSV download instead of JSON' }),
    (0, swagger_1.ApiResponse)({ status: 200, type: [air_quality_response_dto_js_1.HazardousReadingResponseDto] }),
    __param(0, (0, common_1.Param)('city')),
    __param(1, (0, common_1.Query)('hours', new common_1.ParseIntPipe({ optional: true }))),
    __param(2, (0, common_1.Query)('format')),
    __param(3, (0, common_1.Res)({ passthrough: true })),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AirQualityController.prototype, "hazardous", null);
__decorate([
    (0, common_1.Get)('city/:city/duplicates'),
    (0, swagger_1.ApiOperation)({ summary: 'Find candidate duplicate readings for a city over a recent window (default 24h, same station, identical pollutant values, within 60s)' }),
    (0, swagger_1.ApiQuery)({ name: 'hours', required: false, type: Number }),
    __param(0, (0, common_1.Param)('city')),
    __param(1, (0, common_1.Query)('hours', new common_1.ParseIntPipe({ optional: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number]),
    __metadata("design:returntype", Promise)
], AirQualityController.prototype, "duplicates", null);
__decorate([
    (0, common_1.Get)('station/:stationId/latest'),
    (0, swagger_1.ApiOperation)({ summary: 'Get latest reading by station ID' }),
    __param(0, (0, common_1.Param)('stationId', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], AirQualityController.prototype, "latestByStation", null);
exports.AirQualityController = AirQualityController = AirQualityController_1 = __decorate([
    (0, swagger_1.ApiTags)('air-quality'),
    (0, common_1.Controller)('air-quality'),
    __metadata("design:paramtypes", [air_quality_service_js_1.AirQualityService,
        config_1.ConfigService])
], AirQualityController);
//# sourceMappingURL=air-quality.controller.js.map