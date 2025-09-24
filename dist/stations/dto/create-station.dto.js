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
exports.UpdateStationDto = exports.StationResponseDto = exports.CreateStationDto = void 0;
// src/station/dto/create-station.dto.ts
const class_validator_1 = require("class-validator");
const swagger_1 = require("@nestjs/swagger");
const swagger_2 = require("@nestjs/swagger");
const class_transformer_1 = require("class-transformer");
class CreateStationDto {
    name;
    city;
    country;
    latitude;
    longitude;
}
exports.CreateStationDto = CreateStationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Name of the monitoring station', example: 'London Central' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateStationDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'City where the station is located', example: 'London' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateStationDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Country where the station is located', example: 'UK' }),
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateStationDto.prototype, "country", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Latitude of the station', example: 51.5074 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateStationDto.prototype, "latitude", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Longitude of the station', example: -0.1278 }),
    (0, class_validator_1.IsNumber)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateStationDto.prototype, "longitude", void 0);
let StationResponseDto = class StationResponseDto {
    id;
    source;
    name;
    city;
    country;
    latitude;
    longitude;
    createdAt;
    externalId;
};
exports.StationResponseDto = StationResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Unique identifier of the station', example: 1 }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Number)
], StationResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'The source of the station data', example: 'local', enum: ['local', 'openaq'] }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", String)
], StationResponseDto.prototype, "source", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Name of the monitoring station', example: 'London Central' }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", String)
], StationResponseDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'City where the station is located', example: 'London' }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", String)
], StationResponseDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Country where the station is located', example: 'UK' }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", String)
], StationResponseDto.prototype, "country", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Latitude of the station', example: 51.5074 }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Number)
], StationResponseDto.prototype, "latitude", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Longitude of the station', example: -0.1278 }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Number)
], StationResponseDto.prototype, "longitude", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Timestamp when the station was created', example: '2025-09-20T14:00:00.000Z' }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Date)
], StationResponseDto.prototype, "createdAt", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'External ID if from another source like OpenAQ', example: '12345', required: false }),
    (0, class_transformer_1.Expose)(),
    __metadata("design:type", Object)
], StationResponseDto.prototype, "externalId", void 0);
exports.StationResponseDto = StationResponseDto = __decorate([
    (0, class_transformer_1.Exclude)() // Exclude all properties by default
], StationResponseDto);
class UpdateStationDto extends (0, swagger_2.PartialType)(CreateStationDto) {
}
exports.UpdateStationDto = UpdateStationDto;
//# sourceMappingURL=create-station.dto.js.map