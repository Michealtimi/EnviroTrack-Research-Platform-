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
exports.OpenAQStationDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class OpenAQStationDto {
    id;
    name;
    city;
    country;
    latitude;
    longitude;
}
exports.OpenAQStationDto = OpenAQStationDto;
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Station ID' }),
    __metadata("design:type", Number)
], OpenAQStationDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Station name' }),
    __metadata("design:type", String)
], OpenAQStationDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'City where station is located' }),
    __metadata("design:type", String)
], OpenAQStationDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Country code' }),
    __metadata("design:type", String)
], OpenAQStationDto.prototype, "country", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Latitude' }),
    __metadata("design:type", Number)
], OpenAQStationDto.prototype, "latitude", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ description: 'Longitude' }),
    __metadata("design:type", Number)
], OpenAQStationDto.prototype, "longitude", void 0);
//# sourceMappingURL=openaq-station.dto.js.map