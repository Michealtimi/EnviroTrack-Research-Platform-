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
exports.UnifiedStationResponseDto = void 0;
const swagger_1 = require("@nestjs/swagger");
class UnifiedStationResponseDto {
    id;
    name;
    city;
    country;
    latitude;
    longitude;
    source;
}
exports.UnifiedStationResponseDto = UnifiedStationResponseDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'local-1', description: 'Unique station ID (local or OpenAQ)' }),
    __metadata("design:type", String)
], UnifiedStationResponseDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Lagos Main Station' }),
    __metadata("design:type", String)
], UnifiedStationResponseDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'Lagos' }),
    __metadata("design:type", String)
], UnifiedStationResponseDto.prototype, "city", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'NG' }),
    __metadata("design:type", String)
], UnifiedStationResponseDto.prototype, "country", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 6.5244 }),
    __metadata("design:type", Number)
], UnifiedStationResponseDto.prototype, "latitude", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 3.3792 }),
    __metadata("design:type", Number)
], UnifiedStationResponseDto.prototype, "longitude", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'local', enum: ['local', 'openaq'] }),
    __metadata("design:type", String)
], UnifiedStationResponseDto.prototype, "source", void 0);
//# sourceMappingURL=unified-station-response.dto.js.map