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
var OpenAQController_1;
import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AirQualityService } from '../air-quality/air-quality.service.js';
let OpenAQController = OpenAQController_1 = class OpenAQController {
    airQualityService;
    logger = new Logger(OpenAQController_1.name);
    constructor(airQualityService) {
        this.airQualityService = airQualityService;
    }
    async syncParameters(params) {
        this.logger.log(`Received request to sync ${params.length} parameters.`);
        return this.airQualityService.syncOpenAQParameters(params);
    }
    async syncMeasurements(measurements) {
        this.logger.log(`Received request to sync ${measurements.length} measurements.`);
        return this.airQualityService.syncOpenAQMeasurements(measurements);
    }
    async fullSync(data) {
        this.logger.log(`Received request for full OpenAQ sync.`);
        return this.airQualityService.fullOpenAQSync(data);
    }
};
__decorate([
    Post('parameters/sync'),
    ApiOperation({ summary: 'Sync OpenAQ parameters' }),
    ApiResponse({ status: 201, description: 'Parameters synced successfully.' }),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], OpenAQController.prototype, "syncParameters", null);
__decorate([
    Post('measurements/sync'),
    ApiOperation({ summary: 'Sync OpenAQ measurements' }),
    ApiResponse({ status: 201, description: 'Measurements synced successfully.' }),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], OpenAQController.prototype, "syncMeasurements", null);
__decorate([
    Post('full-sync'),
    ApiOperation({ summary: 'Full sync: parameters + measurements' }),
    ApiResponse({ status: 201, description: 'Full OpenAQ sync completed.' }),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OpenAQController.prototype, "fullSync", null);
OpenAQController = OpenAQController_1 = __decorate([
    ApiTags('OpenAQ') // Group in Swagger UI
    ,
    Controller('openaq'),
    __metadata("design:paramtypes", [AirQualityService])
], OpenAQController);
export { OpenAQController };
//# sourceMappingURL=openaq.controller.js.map