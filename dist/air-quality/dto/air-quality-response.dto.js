var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
// src/air-quality/dto/air-quality-response.dto.ts
import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
let AirQualityReadingResponseDto = class AirQualityReadingResponseDto {
    id;
    stationId;
    pm25;
    pm10;
    co;
    no2;
    createdAt;
};
__decorate([
    ApiProperty({ description: 'Unique identifier of the reading', example: 123 }),
    Expose(),
    __metadata("design:type", Number)
], AirQualityReadingResponseDto.prototype, "id", void 0);
__decorate([
    ApiProperty({ description: 'ID of the associated station', example: 101 }),
    Expose(),
    __metadata("design:type", Number)
], AirQualityReadingResponseDto.prototype, "stationId", void 0);
__decorate([
    ApiProperty({ description: 'Particulate matter 2.5 µg/m³', example: 15.5 }),
    Expose(),
    __metadata("design:type", Number)
], AirQualityReadingResponseDto.prototype, "pm25", void 0);
__decorate([
    ApiProperty({ description: 'Particulate matter 10 µg/m³', example: 25.0 }),
    Expose(),
    __metadata("design:type", Number)
], AirQualityReadingResponseDto.prototype, "pm10", void 0);
__decorate([
    ApiProperty({ description: 'Carbon monoxide ppm', example: 1.2 }),
    Expose(),
    __metadata("design:type", Number)
], AirQualityReadingResponseDto.prototype, "co", void 0);
__decorate([
    ApiProperty({ description: 'Nitrogen dioxide ppm', example: 0.8 }),
    Expose(),
    __metadata("design:type", Number)
], AirQualityReadingResponseDto.prototype, "no2", void 0);
__decorate([
    ApiProperty({ description: 'Timestamp of the reading', example: '2025-09-20T14:00:00.000Z' }),
    Expose(),
    __metadata("design:type", Date)
], AirQualityReadingResponseDto.prototype, "createdAt", void 0);
AirQualityReadingResponseDto = __decorate([
    Exclude() // Exclude all properties by default
], AirQualityReadingResponseDto);
export { AirQualityReadingResponseDto };
//# sourceMappingURL=air-quality-response.dto.js.map