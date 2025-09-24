"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
// src/app.module.ts
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const station_module_js_1 = require("./stations/station.module.js");
const air_quality_module_js_1 = require("./air-quality/air-quality.module.js");
const openaq_module_js_1 = require("./openaq/openaq.module.js");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            schedule_1.ScheduleModule.forRoot(), // 👈 enables cron jobs
            station_module_js_1.StationModule,
            air_quality_module_js_1.AirQualityModule,
            openaq_module_js_1.OpenAQModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map