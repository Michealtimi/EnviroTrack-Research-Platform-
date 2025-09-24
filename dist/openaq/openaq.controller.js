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
var OpenAQController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAQController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const openaq_service_js_1 = require("./openaq.service.js");
let OpenAQController = OpenAQController_1 = class OpenAQController {
    openAQService;
    logger = new common_1.Logger(OpenAQController_1.name);
    constructor(openAQService) {
        this.openAQService = openAQService;
    }
    async syncParameters(params) {
        this.logger.log(`Received request to sync ${params.length} parameters.`);
        return this.openAQService.syncParameters(params);
    }
    async syncMeasurements(measurements) {
        this.logger.log(`Received request to sync ${measurements.length} measurements.`);
        return this.openAQService.syncMeasurements(measurements);
    }
    async fullSync(data) {
        this.logger.log(`Received request for full OpenAQ sync.`);
        return this.openAQService.fullOpenAQSync(data);
    }
};
exports.OpenAQController = OpenAQController;
__decorate([
    (0, common_1.Post)('parameters/sync'),
    (0, swagger_1.ApiOperation)({ summary: 'Sync OpenAQ parameters' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Parameters synced successfully.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], OpenAQController.prototype, "syncParameters", null);
__decorate([
    (0, common_1.Post)('measurements/sync'),
    (0, swagger_1.ApiOperation)({ summary: 'Sync OpenAQ measurements' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Measurements synced successfully.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", Promise)
], OpenAQController.prototype, "syncMeasurements", null);
__decorate([
    (0, common_1.Post)('full-sync'),
    (0, swagger_1.ApiOperation)({ summary: 'Full sync: parameters + measurements' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Full OpenAQ sync completed.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], OpenAQController.prototype, "fullSync", null);
exports.OpenAQController = OpenAQController = OpenAQController_1 = __decorate([
    (0, swagger_1.ApiTags)('OpenAQ'),
    (0, common_1.Controller)('openaq'),
    __metadata("design:paramtypes", [openaq_service_js_1.OpenAQService])
], OpenAQController);
//# sourceMappingURL=openaq.controller.js.map