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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var StationController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StationController = void 0;
const common_1 = require("@nestjs/common");
const station_service_js_1 = require("./station.service.js");
const swagger_1 = require("@nestjs/swagger");
const create_station_dto_js_1 = require("./dto/create-station.dto.js");
const unified_station_query_dto_js_1 = require("./dto/unified-station-query.dto.js");
const api_key_guard_js_1 = require("../common/guards/api-key.guard.js");
let StationController = StationController_1 = class StationController {
    stationService;
    logger = new common_1.Logger(StationController_1.name);
    constructor(stationService) {
        this.stationService = stationService;
    }
    // -----------------------------
    // ✅ Create station
    // -----------------------------
    async create(body) {
        this.logger.log(`Request to create station with data: ${JSON.stringify(body)}`);
        return this.stationService.createStation(body);
    }
    // -----------------------------
    // ✅ Get all local stations
    // -----------------------------
    async findAll() {
        this.logger.log('Request to get all stations');
        return this.stationService.getAllStations();
    }
    // -----------------------------
    // ✅ Get stations by city
    // -----------------------------
    async findByCity(city) {
        this.logger.log(`Request to get stations by city: ${city}`);
        return this.stationService.getStationsByCity(city);
    }
    // -----------------------------
    // ✅ NEW: Unified stations endpoint
    // -----------------------------
    async getUnifiedStations(query) {
        this.logger.log(`Request to get unified stations ${JSON.stringify(query)}`);
        return this.stationService.getUnifiedStations(query.city, query.country, query.source, query.page, query.limit);
    }
    // -----------------------------
    // ✅ NEW: Reporting completeness for OpenAQ-synced stations
    // -----------------------------
    async completeness(id, hours) {
        this.logger.log(`Request for completeness on station ${id}`);
        return this.stationService.getCompleteness(id, hours);
    }
    // -----------------------------
    // ✅ Get station by ID
    // -----------------------------
    async findOne(id) {
        this.logger.log(`Request to get station by ID: ${id}`);
        return this.stationService.getStationById(id);
    }
    // -----------------------------
    // ✅ Update station
    // -----------------------------
    async update(id, body) {
        this.logger.log(`Request to update station with ID: ${id}`);
        // ApiKeyGuard already rejected this request if the key didn't match - always "admin" here.
        return this.stationService.updateStation(id, body, 'admin');
    }
    // -----------------------------
    // ✅ Delete station
    // -----------------------------
    async remove(id) {
        this.logger.log(`Request to delete station with ID: ${id}`);
        // ApiKeyGuard already rejected this request if the key didn't match - always "admin" here.
        return this.stationService.deleteStation(id, 'admin');
    }
};
exports.StationController = StationController;
__decorate([
    (0, common_1.Post)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create a new station' }),
    (0, swagger_1.ApiBody)({ type: create_station_dto_js_1.CreateStationDto }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_station_dto_js_1.CreateStationDto]),
    __metadata("design:returntype", Promise)
], StationController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all stations' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], StationController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('city/:city'),
    (0, swagger_1.ApiOperation)({ summary: 'Get stations in a city' }),
    __param(0, (0, common_1.Param)('city')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StationController.prototype, "findByCity", null);
__decorate([
    (0, common_1.Get)('unified'),
    (0, swagger_1.ApiOperation)({ summary: 'Get unified list of stations (local + OpenAQ)' }),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [unified_station_query_dto_js_1.UnifiedStationQueryDto]),
    __metadata("design:returntype", Promise)
], StationController.prototype, "getUnifiedStations", null);
__decorate([
    (0, common_1.Get)(':id/completeness'),
    (0, swagger_1.ApiOperation)({ summary: 'Get reporting completeness for an OpenAQ-synced station over a recent window (default 24h)' }),
    (0, swagger_1.ApiQuery)({ name: 'hours', required: false, type: Number }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Query)('hours', new common_1.ParseIntPipe({ optional: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, Number]),
    __metadata("design:returntype", Promise)
], StationController.prototype, "completeness", null);
__decorate([
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get station by ID' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], StationController.prototype, "findOne", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(api_key_guard_js_1.ApiKeyGuard),
    (0, swagger_1.ApiHeader)({ name: 'x-api-key', required: true, description: 'Admin API key' }),
    (0, swagger_1.ApiOperation)({ summary: 'Update a station (requires admin API key)' }),
    (0, swagger_1.ApiBody)({ type: create_station_dto_js_1.UpdateStationDto }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, create_station_dto_js_1.UpdateStationDto]),
    __metadata("design:returntype", Promise)
], StationController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(api_key_guard_js_1.ApiKeyGuard),
    (0, swagger_1.ApiHeader)({ name: 'x-api-key', required: true, description: 'Admin API key' }),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a station (requires admin API key)' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], StationController.prototype, "remove", null);
exports.StationController = StationController = StationController_1 = __decorate([
    (0, swagger_1.ApiTags)('stations'),
    (0, common_1.Controller)('stations'),
    __metadata("design:paramtypes", [station_service_js_1.StationService])
], StationController);
//# sourceMappingURL=station.controller.js.map