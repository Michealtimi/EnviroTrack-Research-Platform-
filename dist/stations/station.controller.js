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
    // ✅ Get station by ID
    // -----------------------------
    async findOne(id) {
        this.logger.log(`Request to get station by ID: ${id}`);
        return this.stationService.getStationById(id);
    }
    // -----------------------------
    // ✅ Get stations by city
    // -----------------------------
    async findByCity(city) {
        this.logger.log(`Request to get stations by city: ${city}`);
        return this.stationService.getStationsByCity(city);
    }
    // -----------------------------
    // ✅ Update station
    // -----------------------------
    async update(id, body) {
        this.logger.log(`Request to update station with ID: ${id}`);
        return this.stationService.updateStation(id, body);
    }
    // -----------------------------
    // ✅ Delete station
    // -----------------------------
    async remove(id) {
        this.logger.log(`Request to delete station with ID: ${id}`);
        return this.stationService.deleteStation(id);
    }
    // -----------------------------
    // ✅ NEW: Unified stations endpoint
    // -----------------------------
    async getUnifiedStations(city, country, source, page = 1, limit = 10) {
        this.logger.log(`Request to get unified stations [city=${city}, country=${country}, source=${source}, page=${page}, limit=${limit}]`);
        return this.stationService.getUnifiedStations(city, country, source, page, limit);
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
    (0, common_1.Get)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get station by ID' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], StationController.prototype, "findOne", null);
__decorate([
    (0, common_1.Get)('city/:city'),
    (0, swagger_1.ApiOperation)({ summary: 'Get stations in a city' }),
    __param(0, (0, common_1.Param)('city')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], StationController.prototype, "findByCity", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a station' }),
    (0, swagger_1.ApiBody)({ type: create_station_dto_js_1.UpdateStationDto }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number, create_station_dto_js_1.UpdateStationDto]),
    __metadata("design:returntype", Promise)
], StationController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a station' }),
    __param(0, (0, common_1.Param)('id', common_1.ParseIntPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Number]),
    __metadata("design:returntype", Promise)
], StationController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)('unified'),
    (0, swagger_1.ApiOperation)({ summary: 'Get unified list of stations (local + OpenAQ)' }),
    (0, swagger_1.ApiQuery)({ name: 'city', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'country', required: false }),
    (0, swagger_1.ApiQuery)({ name: 'source', required: false, enum: ['local', 'openaq'] }),
    (0, swagger_1.ApiQuery)({ name: 'page', required: false, type: Number }),
    (0, swagger_1.ApiQuery)({ name: 'limit', required: false, type: Number }),
    __param(0, (0, common_1.Query)('city')),
    __param(1, (0, common_1.Query)('country')),
    __param(2, (0, common_1.Query)('source')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], StationController.prototype, "getUnifiedStations", null);
exports.StationController = StationController = StationController_1 = __decorate([
    (0, swagger_1.ApiTags)('stations'),
    (0, common_1.Controller)('stations'),
    __metadata("design:paramtypes", [station_service_js_1.StationService])
], StationController);
//# sourceMappingURL=station.controller.js.map