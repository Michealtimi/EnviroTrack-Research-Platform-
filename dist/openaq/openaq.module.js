"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAQModule = void 0;
// src/openaq/openaq.module.ts
const common_1 = require("@nestjs/common");
const station_repository_1 = require("../stations/station.repository");
const air_quality_service_js_1 = require("../air-quality/air-quality.service.js");
const air_quality_repository_js_1 = require("../air-quality/air-quality.repository.js");
const openaq_sync_service_js_1 = require("./openaq-sync.service.js");
const openaq_service_js_1 = require("./openaq.service.js");
const openaq_controller_js_1 = require("./openaq.controller.js");
const station_service_js_1 = require("../stations/station.service.js");
const prisma_service_js_1 = require("../prisma/prisma.service.js"); // <-- ADD THIS IMPORT
let OpenAQModule = class OpenAQModule {
};
exports.OpenAQModule = OpenAQModule;
exports.OpenAQModule = OpenAQModule = __decorate([
    (0, common_1.Module)({
        imports: [],
        controllers: [openaq_controller_js_1.OpenAQController],
        providers: [
            openaq_sync_service_js_1.OpenAQSyncService,
            openaq_service_js_1.OpenAQService,
            station_service_js_1.StationService,
            station_repository_1.StationRepository,
            air_quality_service_js_1.AirQualityService,
            air_quality_repository_js_1.AirQualityRepository,
            prisma_service_js_1.PrismaService, // <-- ADD THIS PROVIDER
        ],
    })
], OpenAQModule);
//# sourceMappingURL=openaq.module.js.map