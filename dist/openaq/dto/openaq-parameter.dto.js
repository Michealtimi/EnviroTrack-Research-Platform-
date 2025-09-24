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
exports.OpenAQParameterDto = void 0;
// src/openaq/dto/openaq-parameter.dto.ts
const swagger_1 = require("@nestjs/swagger");
class OpenAQParameterDto {
    id;
    name;
    displayName;
    units;
    description;
}
exports.OpenAQParameterDto = OpenAQParameterDto;
__decorate([
    (0, swagger_1.ApiProperty)({ example: 2 }),
    __metadata("design:type", Number)
], OpenAQParameterDto.prototype, "id", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'pm25' }),
    __metadata("design:type", String)
], OpenAQParameterDto.prototype, "name", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'PM2.5' }),
    __metadata("design:type", String)
], OpenAQParameterDto.prototype, "displayName", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({ example: 'µg/m³' }),
    __metadata("design:type", String)
], OpenAQParameterDto.prototype, "units", void 0);
__decorate([
    (0, swagger_1.ApiProperty)({
        example: 'Particulate matter less than 2.5 micrometers in diameter mass concentration',
    }),
    __metadata("design:type", String)
], OpenAQParameterDto.prototype, "description", void 0);
//# sourceMappingURL=openaq-parameter.dto.js.map