var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AirQualityRepository } from './air-quality.repository.js';
import { StationRepository } from '../stations/station.repository.js';
import { AirQualityController } from './air-quality.controller.js';
import { AirQualityService } from './air-quality.service.js';
let AirQualityModule = class AirQualityModule {
};
AirQualityModule = __decorate([
    Module({
        controllers: [AirQualityController],
        providers: [PrismaService, AirQualityRepository, StationRepository, AirQualityService],
    })
], AirQualityModule);
export { AirQualityModule };
//# sourceMappingURL=air-quality.module.js.map