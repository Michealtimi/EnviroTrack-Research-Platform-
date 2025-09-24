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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AirQualityReadingResponseDto = void 0;
// src/air-quality/dto/air-quality-response.dto.ts
const class_transformer_1 = require("class-transformer");
const swagger_1 = require("@nestjs/swagger");
let AirQualityReadingResponseDto = class AirQualityReadingResponseDto {
    id;
    stationId;
    pm25;
    pm10;
    co;
    no2;
    createdAt;
};
exports.AirQualityReadingResponseDto = AirQualityReadingResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Unique identifier of the reading', example: 123 }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Number)
], AirQualityReadingResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'ID of the associated station', example: 101 }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Number)
], AirQualityReadingResponseDto.prototype, "stationId", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Particulate matter 2.5 µg/m³', example: 15.5 }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Number)
], AirQualityReadingResponseDto.prototype, "pm25", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Particulate matter 10 µg/m³', example: 25.0 }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Number)
], AirQualityReadingResponseDto.prototype, "pm10", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Carbon monoxide ppm', example: 1.2 }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Number)
], AirQualityReadingResponseDto.prototype, "co", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Nitrogen dioxide ppm', example: 0.8 }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Number)
], AirQualityReadingResponseDto.prototype, "no2", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Timestamp of the reading', example: '2025-09-20T14:00:00.000Z' }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Date)
], AirQualityReadingResponseDto.prototype, "createdAt", void 0);
exports.AirQualityReadingResponseDto = AirQualityReadingResponseDto = __decorate([
    (0, class_transformer_1.Exclude)() // Exclude all properties by default
], AirQualityReadingResponseDto);
//# sourceMappingURL=air-quality-response.dto.js.map