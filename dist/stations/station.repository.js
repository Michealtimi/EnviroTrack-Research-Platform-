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
var StationRepository_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.StationRepository = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_js_1 = require("../prisma/prisma.service.js");
let StationRepository = StationRepository_1 = class StationRepository {
    prisma;
    logger = new common_1.Logger(StationRepository_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        this.logger.log(`Creating new station with name: ${data.name}`);
        try {
            const result = await this.prisma.station.create({ data });
            this.logger.log(`Successfully created station with ID: ${result.id}`);
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to create station. Error: ${errorMessage}`);
            throw new common_1.InternalServerErrorException('Failed to create station in the database.');
        }
    }
    async findAll(filter) {
        this.logger.log('Fetching all stations...');
        try {
            const result = await this.prisma.station.findMany({
                where: {
                    ...(filter?.city && { city: filter.city }),
                    ...(filter?.country && { country: filter.country }),
                },
                orderBy: { createdAt: 'desc' },
            });
            this.logger.log(`Found ${result.length} stations.`);
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to fetch all stations. Error: ${errorMessage}`);
            throw new common_1.InternalServerErrorException('Failed to retrieve stations from the database.');
        }
    }
    async findById(id) {
        this.logger.log(`Fetching station by ID: ${id}`);
        try {
            const result = await this.prisma.station.findUnique({ where: { id } });
            if (result) {
                this.logger.log(`Found station with ID: ${id}`);
            }
            else {
                this.logger.warn(`No station found with ID: ${id}`);
            }
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to fetch station by ID ${id}. Error: ${errorMessage}`);
            throw new common_1.InternalServerErrorException('Failed to retrieve station from the database.');
        }
    }
    async findByCity(city) {
        this.logger.log(`Fetching stations in city: ${city}`);
        try {
            const result = await this.prisma.station.findMany({ where: { city } });
            this.logger.log(`Found ${result.length} stations in ${city}.`);
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to fetch stations by city ${city}. Error: ${errorMessage}`);
            throw new common_1.InternalServerErrorException('Failed to retrieve stations by city from the database.');
        }
    }
    async findByNameAndCity(name, city) {
        this.logger.log(`Checking for existing station named "${name}" in "${city}"`);
        try {
            return this.prisma.station.findFirst({ where: { name, city } });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Database query failed for station check. Error: ${errorMessage}`);
            throw new common_1.InternalServerErrorException('Database error during station lookup.');
        }
    }
    async update(id, data) {
        this.logger.log(`Updating station with ID: ${id}`);
        try {
            const result = await this.prisma.station.update({ where: { id }, data });
            this.logger.log(`Station updated successfully: ${result.id}`);
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to update station ID ${id}. Error: ${errorMessage}`);
            throw new common_1.InternalServerErrorException('Failed to update station in the database.');
        }
    }
    async delete(id) {
        this.logger.log(`Deleting station with ID: ${id}`);
        try {
            // Use a transaction to ensure both deletes happen or neither do.
            const result = await this.prisma.$transaction(async (tx) => {
                // First, delete all related air quality readings
                await tx.airQuality.deleteMany({ where: { stationId: id } });
                // Then, delete the station
                return tx.station.delete({ where: { id } });
            });
            this.logger.log(`Station and its readings deleted successfully: ${result.id}`);
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to delete station ID ${id}. Error: ${errorMessage}`);
            throw new common_1.InternalServerErrorException('Failed to delete station from the database.');
        }
    }
    async findFirst(where) {
        this.logger.log(`Finding first station with where: ${JSON.stringify(where)}`);
        try {
            return this.prisma.station.findFirst({ where });
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Database query failed for findFirst station. Error: ${errorMessage}`);
            throw new common_1.InternalServerErrorException('Database error during station lookup.');
        }
    }
    async findUnified(filter, pagination) {
        this.logger.log(`Finding unified stations with filter: ${JSON.stringify(filter)}`);
        const { city, country, source } = filter || {};
        const { page = 1, limit = 10 } = pagination || {};
        const skip = (page - 1) * limit;
        const where = {
            ...(city && { city: { contains: city, mode: 'insensitive' } }),
            ...(country && { country }),
            ...(source && { source }),
        };
        try {
            const [stations, total] = await this.prisma.$transaction([
                this.prisma.station.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                }),
                this.prisma.station.count({ where }),
            ]);
            const data = stations.map((s) => ({
                id: s.source === 'openaq' ? `openaq-${s.externalId}` : `local-${s.id}`,
                name: s.name,
                city: s.city,
                country: s.country,
                latitude: s.latitude,
                longitude: s.longitude,
                source: s.source,
            }));
            return { data, total };
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to find unified stations. Error: ${errorMessage}`);
            throw new common_1.InternalServerErrorException('Failed to retrieve unified stations.');
        }
    }
    async upsertFromOpenAQ(stationData) {
        this.logger.log(`🔄 Upserting OpenAQ station [${stationData.externalId}] (${stationData.name})`);
        const { externalId, ...restOfData } = stationData;
        const existing = await this.prisma.station.findFirst({
            where: { externalId },
        });
        try {
            if (existing) {
                const result = await this.prisma.station.update({
                    where: { id: existing.id },
                    data: restOfData,
                });
                this.logger.log(`✅ Updated station: ${result.name} (${result.city})`);
                return result;
            }
            const result = await this.prisma.station.create({
                data: { ...stationData, source: 'openaq' },
            });
            this.logger.log(`✅ Created station: ${result.name} (${result.city})`);
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`❌ Failed to upsert OpenAQ station ${externalId}. Error: ${errorMessage}`);
            throw new common_1.InternalServerErrorException('Failed to sync OpenAQ station.');
        }
    }
};
exports.StationRepository = StationRepository;
exports.StationRepository = StationRepository = StationRepository_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_js_1.PrismaService])
], StationRepository);
//# sourceMappingURL=station.repository.js.map