var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ApiProperty } from '@nestjs/swagger';
export class OpenAQMeasurementDto {
    stationId;
    parameterId;
    value;
    dateUtc;
}
__decorate([
    ApiProperty({ description: 'Station ID' }),
    __metadata("design:type", Number)
], OpenAQMeasurementDto.prototype, "stationId", void 0);
__decorate([
    ApiProperty({ description: 'Parameter ID' }),
    __metadata("design:type", Number)
], OpenAQMeasurementDto.prototype, "parameterId", void 0);
__decorate([
    ApiProperty({ description: 'Measured value' }),
    __metadata("design:type", Number)
], OpenAQMeasurementDto.prototype, "value", void 0);
__decorate([
    ApiProperty({ description: 'UTC timestamp of measurement' }),
    __metadata("design:type", String)
], OpenAQMeasurementDto.prototype, "dateUtc", void 0);
//# sourceMappingURL=openaq-measurement.dto.js.map