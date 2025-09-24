"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AirQualityModule = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../prisma/prisma.service.js");
const air_quality_repository_js_1 = require("./air-quality.repository.js");
const station_repository_js_1 = require("../stations/station.repository.js");
const air_quality_controller_js_1 = require("./air-quality.controller.js");
const air_quality_service_js_1 = require("./air-quality.service.js");
let AirQualityModule = class AirQualityModule {
};
exports.AirQualityModule = AirQualityModule;
exports.AirQualityModule = AirQualityModule = __decorate([
    (0, common_1.Module)({
        controllers: [air_quality_controller_js_1.AirQualityController],
        providers: [
            prisma_service_js_1.PrismaService,
            air_quality_repository_js_1.AirQualityRepository,
            station_repository_js_1.StationRepository,
            air_quality_service_js_1.AirQualityService,
        ],
        exports: [air_quality_service_js_1.AirQualityService],
    })
], AirQualityModule);
//# sourceMappingURL=air-quality.module.js.map