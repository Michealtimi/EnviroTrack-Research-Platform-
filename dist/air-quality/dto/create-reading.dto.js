var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
// src/air-quality/dto/create-air-quality.dto.ts
import { IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class CreateAirQualityDto {
    pm25;
    pm10;
    co;
    no2;
}
__decorate([
    ApiProperty({ description: 'Particulate matter 2.5 µg/m³', example: 15.5 }),
    IsNumber(),
    IsNotEmpty(),
    __metadata("design:type", Number)
], CreateAirQualityDto.prototype, "pm25", void 0);
__decorate([
    ApiProperty({ description: 'Particulate matter 10 µg/m³', example: 25.0 }),
    IsNumber(),
    IsNotEmpty(),
    __metadata("design:type", Number)
], CreateAirQualityDto.prototype, "pm10", void 0);
__decorate([
    ApiProperty({ description: 'Carbon monoxide ppm', example: 1.2 }),
    IsNumber(),
    IsNotEmpty(),
    __metadata("design:type", Number)
], CreateAirQualityDto.prototype, "co", void 0);
__decorate([
    ApiProperty({ description: 'Nitrogen dioxide ppm', example: 0.8 }),
    IsNumber(),
    IsNotEmpty(),
    __metadata("design:type", Number)
], CreateAirQualityDto.prototype, "no2", void 0);
//# sourceMappingURL=create-reading.dto.js.map