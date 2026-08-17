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
exports.CreateAirQualityDto = void 0;
// src/air-quality/dto/create-air-quality.dto.ts
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
class CreateAirQualityDto {
    pm25;
    pm10;
    co;
    no2;
    o3;
    so2;
    instrumentModel;
    calibrationDate;
    samplingDurationMinutes;
    weatherConditions;
    temperature;
    humidity;
}
exports.CreateAirQualityDto = CreateAirQualityDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Particulate matter 2.5 µg/m³', example: 15.5, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(2000),
    __metadata("design:type", Number)
], CreateAirQualityDto.prototype, "pm25", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Particulate matter 10 µg/m³', example: 25.0, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(2000),
    __metadata("design:type", Number)
], CreateAirQualityDto.prototype, "pm10", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Carbon monoxide µg/m³', example: 1200, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(500),
    __metadata("design:type", Number)
], CreateAirQualityDto.prototype, "co", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Nitrogen dioxide µg/m³', example: 18, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(500),
    __metadata("design:type", Number)
], CreateAirQualityDto.prototype, "no2", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Ozone µg/m³', example: 40, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(500),
    __metadata("design:type", Number)
], CreateAirQualityDto.prototype, "o3", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Sulfur dioxide µg/m³', example: 12, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(500),
    __metadata("design:type", Number)
], CreateAirQualityDto.prototype, "so2", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Instrument model used to take this reading', example: 'Aeroqual Series 500', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(200),
    __metadata("design:type", String)
], CreateAirQualityDto.prototype, "instrumentModel", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Date the instrument was last calibrated (ISO 8601)', example: '2026-06-01', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsDateString)(),
    __metadata("design:type", String)
], CreateAirQualityDto.prototype, "calibrationDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'How long the sample was taken over, in minutes', example: 15, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(1440),
    __metadata("design:type", Number)
], CreateAirQualityDto.prototype, "samplingDurationMinutes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Free-text weather conditions at the time of the reading', example: 'Sunny, light wind, 28°C', required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.MaxLength)(500),
    __metadata("design:type", String)
], CreateAirQualityDto.prototype, "weatherConditions", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Ambient temperature, °C', example: 28.4, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(-90),
    (0, class_validator_1.Max)(60),
    __metadata("design:type", Number)
], CreateAirQualityDto.prototype, "temperature", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Relative humidity, %', example: 61, required: false }),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.Min)(0),
    (0, class_validator_1.Max)(100),
    __metadata("design:type", Number)
], CreateAirQualityDto.prototype, "humidity", void 0);
//# sourceMappingURL=create-reading.dto.js.map