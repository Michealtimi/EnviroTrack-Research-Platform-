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
const swagger_1 = require("@nestjs/swagger");
const create_reading_dto_js_1 = require("./dto/create-reading.dto.js");
const air_quality_service_js_1 = require("./air-quality.service.js");
let AirQualityController = AirQualityController_1 = class AirQualityController {
    airQualityService;
    logger = new common_1.Logger(AirQualityController_1.name);
    constructor(airQualityService) {
        this.airQualityService = airQualityService;
    }
    async create(stationId, body) {
        this.logger.log(`Request to create reading for station ID: ${stationId}`);
        // The `createReading` service method expects an `o3` property, which is missing
        // from `CreateAirQualityDto`. We'll add it here, defaulting to `null` as it's
        // optional in the database schema.
        const readingData = { ...body, o3: body.o3 ?? null };
        return this.airQualityService.createReading(stationId, readingData);
    }
    async findByStation(stationId) {
        this.logger.log(`Request to get all readings for station ID: ${stationId}`);
        return this.airQualityService.getReadingsByStation(stationId);
    }
    async findByCity(city) {
        this.logger.log(`Request to get all readings for city: ${city}`);
        return this.airQualityService.getReadingsByCity(city);
    }
    async averageByCity(city) {
        this.logger.log(`Request to get average pollution for city: ${city}`);
        return this.airQualityService.getAveragePollutionByCity(city);
    }
    async hazardous(city) {
        this.logger.log(`Request to get hazardous readings for city: ${city}`);
        return this.airQualityService.getHazardousReadings(city);
    }
    async latestByStation(stationId) {
        this.logger.log(`Request to get latest reading for station ID: ${stationId}`);
        return this.airQualityService.getLatestReadingByStation(stationId);
    }
};
exports.AirQualityController = AirQualityController;
__decorate([
    (0, common_1.Post)('station/:stationId'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new air quality reading for a station' }),
    (0, swagger_1.ApiBody)({ type: create_reading_dto_js_1.CreateAirQualityDto }),
    __param(0, (0, common_1.Param)('stationId', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, create_reading_dto_js_1.CreateAirQualityDto]),
    __metadata("design:returntype", Promise)
], AirQualityController.prototype, "create", null);
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
    (0, swagger_1.ApiOperation)({ summary: 'Get average pollution by city' }),
    __param(0, (0, common_1.Param)('city')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AirQualityController.prototype, "averageByCity", null);
__decorate([
    (0, common_1.Get)('city/:city/hazardous'),
    (0, swagger_1.ApiOperation)({ summary: 'Get hazardous readings by city' }),
    __param(0, (0, common_1.Param)('city')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AirQualityController.prototype, "hazardous", null);
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
    __metadata("design:paramtypes", [air_quality_service_js_1.AirQualityService])
], AirQualityController);
//# sourceMappingURL=air-quality.controller.js.map