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
exports.HazardousReadingResponseDto = exports.ExceedanceDto = exports.AirQualityReadingResponseDto = void 0;
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
    o3;
    so2;
    instrumentModel;
    calibrationDate;
    samplingDurationMinutes;
    weatherConditions;
    temperature;
    humidity;
    measuredAt;
    isSuspect;
    suspectReason;
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
    (0, swagger_1.ApiProperty)({ description: 'Particulate matter 2.5 µg/m³', example: 15.5, nullable: true }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Object)
], AirQualityReadingResponseDto.prototype, "pm25", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Particulate matter 10 µg/m³', example: 25.0, nullable: true }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Object)
], AirQualityReadingResponseDto.prototype, "pm10", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Carbon monoxide µg/m³', example: 1200, nullable: true }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Object)
], AirQualityReadingResponseDto.prototype, "co", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Nitrogen dioxide µg/m³', example: 18, nullable: true }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Object)
], AirQualityReadingResponseDto.prototype, "no2", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Ozone µg/m³', example: 40, nullable: true }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Object)
], AirQualityReadingResponseDto.prototype, "o3", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Sulfur dioxide µg/m³', example: 12, nullable: true }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Object)
], AirQualityReadingResponseDto.prototype, "so2", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Instrument model used to take this reading', example: 'Aeroqual Series 500', nullable: true }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Object)
], AirQualityReadingResponseDto.prototype, "instrumentModel", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Date the instrument was last calibrated', example: '2026-06-01T00:00:00.000Z', nullable: true }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Object)
], AirQualityReadingResponseDto.prototype, "calibrationDate", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Sampling duration, minutes', example: 15, nullable: true }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Object)
], AirQualityReadingResponseDto.prototype, "samplingDurationMinutes", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Weather conditions at the time of the reading', example: 'Sunny, light wind, 28°C', nullable: true }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Object)
], AirQualityReadingResponseDto.prototype, "weatherConditions", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Ambient temperature, °C', example: 28.4, nullable: true }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Object)
], AirQualityReadingResponseDto.prototype, "temperature", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Relative humidity, %', example: 61, nullable: true }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Object)
], AirQualityReadingResponseDto.prototype, "humidity", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'When this reading was actually measured (if different from when the server received it)', example: '2026-07-15T09:00:00.000Z', nullable: true }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Object)
], AirQualityReadingResponseDto.prototype, "measuredAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Whether a steward has flagged this reading as suspect', example: false }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Boolean)
], AirQualityReadingResponseDto.prototype, "isSuspect", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Steward-provided reason the reading is flagged suspect', example: null, nullable: true }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Object)
], AirQualityReadingResponseDto.prototype, "suspectReason", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Timestamp of the reading', example: '2025-09-20T14:00:00.000Z' }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Date)
], AirQualityReadingResponseDto.prototype, "createdAt", void 0);
exports.AirQualityReadingResponseDto = AirQualityReadingResponseDto = __decorate([
    (0, class_transformer_1.Exclude)() // Exclude all properties by default
], AirQualityReadingResponseDto);
class ExceedanceDto {
    pollutant;
    value;
    limit;
    factor;
}
exports.ExceedanceDto = ExceedanceDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Pollutant that exceeded its WHO 2021 guideline value', example: 'no2' }),
    __metadata("design:type", String)
], ExceedanceDto.prototype, "pollutant", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Measured value, µg/m³', example: 325 }),
    __metadata("design:type", Number)
], ExceedanceDto.prototype, "value", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'WHO 2021 guideline limit, µg/m³', example: 25 }),
    __metadata("design:type", Number)
], ExceedanceDto.prototype, "limit", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Multiple of the WHO limit (value / limit, rounded to 1 decimal)', example: 13 }),
    __metadata("design:type", Number)
], ExceedanceDto.prototype, "factor", void 0);
class HazardousReadingResponseDto extends AirQualityReadingResponseDto {
    stationName;
    exceedances;
}
exports.HazardousReadingResponseDto = HazardousReadingResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Name of the station where this reading was taken', example: 'Ijebu-Ode Roadside' }),
    __metadata("design:type", String)
], HazardousReadingResponseDto.prototype, "stationName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Pollutants that exceeded their WHO 2021 guideline value, with the exceedance factor', type: [ExceedanceDto] }),
    __metadata("design:type", Array)
], HazardousReadingResponseDto.prototype, "exceedances", void 0);
//# sourceMappingURL=air-quality-response.dto.js.map