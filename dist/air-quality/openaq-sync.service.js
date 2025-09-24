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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var OpenAQSyncService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAQSyncService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const openaq_service_1 = require("../openaq/openaq.service");
const node_fetch_1 = __importDefault(require("node-fetch"));
let OpenAQSyncService = OpenAQSyncService_1 = class OpenAQSyncService {
    openAQService;
    logger = new common_1.Logger(OpenAQSyncService_1.name);
    constructor(openAQService) {
        this.openAQService = openAQService;
    }
    async handleOpenAQSync() {
        this.logger.log('Starting OpenAQ sync via Cron job...');
        try {
            const paramResponse = await (0, node_fetch_1.default)('https://api.openaq.org/v2/parameters');
            const paramData = (await paramResponse.json());
            const parameters = paramData.results.map((p) => ({
                id: p.id,
                name: p.name,
                displayName: p.displayName,
                units: p.unit,
                description: p.description,
            }));
            const measurementResponse = await (0, node_fetch_1.default)('https://api.openaq.org/v2/latest?limit=10000');
            const measurementData = (await measurementResponse.json());
            const measurements = [];
            for (const record of measurementData.results) {
                const station = await this.openAQService.findStationByNameAndCity(record.location, record.city);
                if (!station)
                    continue;
                for (const m of record.measurements) {
                    measurements.push({
                        stationId: station.id,
                        parameterId: m.parameterId,
                        value: m.value,
                        dateUtc: m.lastUpdated,
                    });
                }
            }
            await this.openAQService.fullOpenAQSync({ parameters, measurements });
            this.logger.log('OpenAQ sync completed successfully.');
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`OpenAQ sync failed. Error: ${errorMessage}`);
        }
    }
};
exports.OpenAQSyncService = OpenAQSyncService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_HOUR),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], OpenAQSyncService.prototype, "handleOpenAQSync", null);
exports.OpenAQSyncService = OpenAQSyncService = OpenAQSyncService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [openaq_service_1.OpenAQService])
], OpenAQSyncService);
//# sourceMappingURL=openaq-sync.service.js.map