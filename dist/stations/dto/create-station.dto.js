var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
// src/station/dto/create-station.dto.ts
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
export class CreateStationDto {
    name;
    city;
    country;
    latitude;
    longitude;
}
__decorate([
    ApiProperty({ description: 'Name of the monitoring station', example: 'London Central' }),
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], CreateStationDto.prototype, "name", void 0);
__decorate([
    ApiProperty({ description: 'City where the station is located', example: 'London' }),
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], CreateStationDto.prototype, "city", void 0);
__decorate([
    ApiProperty({ description: 'Country where the station is located', example: 'UK' }),
    IsString(),
    IsNotEmpty(),
    __metadata("design:type", String)
], CreateStationDto.prototype, "country", void 0);
__decorate([
    ApiProperty({ description: 'Latitude of the station', example: 51.5074 }),
    IsNumber(),
    IsNotEmpty(),
    __metadata("design:type", Number)
], CreateStationDto.prototype, "latitude", void 0);
__decorate([
    ApiProperty({ description: 'Longitude of the station', example: -0.1278 }),
    IsNumber(),
    IsNotEmpty(),
    __metadata("design:type", Number)
], CreateStationDto.prototype, "longitude", void 0);
let StationResponseDto = class StationResponseDto {
    id;
    name;
    city;
    country;
    latitude;
    longitude;
    createdAt;
};
__decorate([
    ApiProperty({ description: 'Unique identifier of the station', example: 1 }),
    Expose(),
    __metadata("design:type", Number)
], StationResponseDto.prototype, "id", void 0);
__decorate([
    ApiProperty({ description: 'Name of the monitoring station', example: 'London Central' }),
    Expose(),
    __metadata("design:type", String)
], StationResponseDto.prototype, "name", void 0);
__decorate([
    ApiProperty({ description: 'City where the station is located', example: 'London' }),
    Expose(),
    __metadata("design:type", String)
], StationResponseDto.prototype, "city", void 0);
__decorate([
    ApiProperty({ description: 'Country where the station is located', example: 'UK' }),
    Expose(),
    __metadata("design:type", String)
], StationResponseDto.prototype, "country", void 0);
__decorate([
    ApiProperty({ description: 'Latitude of the station', example: 51.5074 }),
    Expose(),
    __metadata("design:type", Number)
], StationResponseDto.prototype, "latitude", void 0);
__decorate([
    ApiProperty({ description: 'Longitude of the station', example: -0.1278 }),
    Expose(),
    __metadata("design:type", Number)
], StationResponseDto.prototype, "longitude", void 0);
__decorate([
    ApiProperty({ description: 'Timestamp when the station was created', example: '2025-09-20T14:00:00.000Z' }),
    Expose(),
    __metadata("design:type", Date)
], StationResponseDto.prototype, "createdAt", void 0);
StationResponseDto = __decorate([
    Exclude() // Exclude all properties by default
], StationResponseDto);
export { StationResponseDto };
export class UpdateStationDto extends PartialType(CreateStationDto) {
}
//# sourceMappingURL=create-station.dto.js.map