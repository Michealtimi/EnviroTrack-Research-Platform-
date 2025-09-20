import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { StationRepository } from './station.repository.js';
import { CreateStationDto, UpdateStationDto } from './dto/create-station.dto.js';


@Injectable()
export class StationService {
  private readonly logger = new Logger(StationService.name);

  constructor(private readonly stationRepo: StationRepository) {}

  async createStation(data: CreateStationDto) {
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
    } catch (error: unknown) {
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch all stations. Error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to retrieve stations.');
    }
  }

  async getStationById(id: number) {
    this.logger.log(`Fetching station by ID: ${id}`);
    try {
      const station = await this.stationRepo.findById(id);
      if (!station) {
        this.logger.warn(`Station with ID ${id} not found.`);
        throw new NotFoundException(`Station with ID ${id} not found`);
      }
      this.logger.log(`Station found: ${station.id}`);
      return station;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch station by ID ${id}. Error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to retrieve station.');
    }
  }

  async getStationsByCity(city: string) {
    this.logger.log(`Fetching stations in city: ${city}`);
    try {
      const stations = await this.stationRepo.findByCity(city);
      this.logger.log(`Found ${stations.length} stations in ${city}.`);
      return stations;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch stations in city ${city}. Error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to retrieve stations by city.');
    }
  }

  async updateStation(id: number, data: UpdateStationDto) {
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
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update station ID ${id}. Error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to update station.');
    }
  }

  async deleteStation(id: number) {
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
    } catch (error: unknown) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete station ID ${id}. Error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to delete station.');
    }
  }
}