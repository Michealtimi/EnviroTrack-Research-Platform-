var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
// src/openaq/openaq.module.ts
import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { OpenAQService } from './openaq.service';
import { StationRepository } from '../stations/station.repository';
import { AirQualityService } from '../air-quality/air-quality.service.js';
import { AirQualityRepository } from '../air-quality/air-quality.repository.js';
import { OpenAQController } from './openaq.controller.js';
let OpenAQModule = class OpenAQModule {
};
OpenAQModule = __decorate([
    Module({
        imports: [HttpModule],
        controllers: [OpenAQController], // ✅ Added controller
        providers: [
            OpenAQService,
            StationRepository,
            AirQualityService, // Required by the controller for DB operations
            AirQualityRepository,
        ],
    })
], OpenAQModule);
export { OpenAQModule };
//# sourceMappingURL=openaq.module.js.map