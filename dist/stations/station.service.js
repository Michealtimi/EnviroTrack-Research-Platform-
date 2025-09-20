var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var StationService_1;
import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException, Logger, } from '@nestjs/common';
import { StationRepository } from './station.repository.js';
let StationService = StationService_1 = class StationService {
    stationRepo;
    logger = new Logger(StationService_1.name);
    constructor(stationRepo) {
        this.stationRepo = stationRepo;
    }
    async createStation(data) {
        this.logger.log(`Attempting to create station: ${JSON.stringify(data)}`);
        try {
            const existing = await this.stationRepo.findByNameAndCity(data.name, data.city);
            if (existing) {
                this.logger.warn(`Station "${data.name}" already exists in ${data.city}.`);
                throw new BadRequestException(`Station "${data.name}" already exists in ${data.city}`);
            }
            const station = await this.stationRepo.create(data);
            this.logger.log(`Station created successfully with ID: ${station.id}`);
            return station;
        }
        catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to create station. Error: ${errorMessage}`);
            throw new InternalServerErrorException('Failed to create station. Please try again later.');
        }
    }
    async getAllStations() {
        this.logger.log('Fetching all stations...');
        try {
            const stations = await this.stationRepo.findAll();
            this.logger.log(`Found ${stations.length} stations.`);
            return stations;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to fetch all stations. Error: ${errorMessage}`);
            throw new InternalServerErrorException('Failed to retrieve stations.');
        }
    }
    async getStationById(id) {
        this.logger.log(`Fetching station by ID: ${id}`);
        try {
            const station = await this.stationRepo.findById(id);
            if (!station) {
                this.logger.warn(`Station with ID ${id} not found.`);
                throw new NotFoundException(`Station with ID ${id} not found`);
            }
            this.logger.log(`Station found: ${station.id}`);
            return station;
        }
        catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to fetch station by ID ${id}. Error: ${errorMessage}`);
            throw new InternalServerErrorException('Failed to retrieve station.');
        }
    }
    async getStationsByCity(city) {
        this.logger.log(`Fetching stations in city: ${city}`);
        try {
            const stations = await this.stationRepo.findByCity(city);
            this.logger.log(`Found ${stations.length} stations in ${city}.`);
            return stations;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to fetch stations in city ${city}. Error: ${errorMessage}`);
            throw new InternalServerErrorException('Failed to retrieve stations by city.');
        }
    }
    async updateStation(id, data) {
        this.logger.log(`Updating station ID: ${id}`);
        try {
            const station = await this.stationRepo.findById(id);
            if (!station) {
                this.logger.warn(`Update failed: Station with ID ${id} not found.`);
                throw new NotFoundException(`Station with ID ${id} not found`);
            }
            const updated = await this.stationRepo.update(id, data);
            this.logger.log(`Station updated successfully: ${updated.id}`);
            return updated;
        }
        catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to update station ID ${id}. Error: ${errorMessage}`);
            throw new InternalServerErrorException('Failed to update station.');
        }
    }
    async deleteStation(id) {
        this.logger.log(`Attempting to delete station ID: ${id}`);
        try {
            const station = await this.stationRepo.findById(id);
            if (!station) {
                this.logger.warn(`Delete failed: Station with ID ${id} not found.`);
                throw new NotFoundException(`Station with ID ${id} not found`);
            }
            await this.stationRepo.delete(id);
            this.logger.log(`Station deleted successfully: ${id}`);
            return { message: `Station ${id} deleted successfully` };
        }
        catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Failed to delete station ID ${id}. Error: ${errorMessage}`);
            throw new InternalServerErrorException('Failed to delete station.');
        }
    }
};
StationService = StationService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [StationRepository])
], StationService);
export { StationService };
//# sourceMappingURL=station.service.js.map