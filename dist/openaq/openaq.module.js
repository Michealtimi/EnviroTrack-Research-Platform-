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
const config_1 = require("@nestjs/config");
const axios_1 = require("@nestjs/axios");
const station_module_js_1 = require("../stations/station.module.js");
const air_quality_module_js_1 = require("../air-quality/air-quality.module.js");
const openaq_sync_service_js_1 = require("./openaq-sync.service.js");
const openaq_service_js_1 = require("./openaq.service.js");
const openaq_controller_js_1 = require("./openaq.controller.js");
const prisma_service_js_1 = require("../prisma/prisma.service.js");
let OpenAQModule = class OpenAQModule {
};
exports.OpenAQModule = OpenAQModule;
exports.OpenAQModule = OpenAQModule = __decorate([
    (0, common_1.Module)({
        imports: [
            axios_1.HttpModule,
            config_1.ConfigModule,
            station_module_js_1.StationModule, // <-- Import the whole module
            air_quality_module_js_1.AirQualityModule, // <-- Import the whole module
        ],
        controllers: [openaq_controller_js_1.OpenAQController],
        providers: [openaq_sync_service_js_1.OpenAQSyncService, openaq_service_js_1.OpenAQService, prisma_service_js_1.PrismaService],
    })
], OpenAQModule);
//# sourceMappingURL=openaq.module.js.map