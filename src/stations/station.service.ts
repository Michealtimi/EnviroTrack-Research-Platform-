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

  // -----------------------------
  // ✅ Create a new local station
  // -----------------------------
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
      if (error instanceof BadRequestException) throw error;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create station. Error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to create station. Please try again later.');
    }
  }

  // -----------------------------
  // ✅ Fetch all local stations
  // -----------------------------
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

  // -----------------------------
  // ✅ Fetch station by ID
  // -----------------------------
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
      if (error instanceof NotFoundException) throw error;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch station by ID ${id}. Error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to retrieve station.');
    }
  }

  // -----------------------------
  // ✅ Fetch stations by city
  // -----------------------------
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

  // -----------------------------
  // ✅ Update station
  // -----------------------------
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
      if (error instanceof NotFoundException) throw error;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update station ID ${id}. Error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to update station.');
    }
  }

  // -----------------------------
  // ✅ Delete station
  // -----------------------------
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
      if (error instanceof NotFoundException) throw error;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete station ID ${id}. Error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to delete station.');
    }
  }

  // -----------------------------
  // ✅ NEW: Upsert station from OpenAQ
  // -----------------------------
  async createOrUpdateFromOpenAQ(stationData: {
    openaqStationId: string;
    name: string;
    city: string;
    country: string;
    latitude: number;
    longitude: number;
  }) {
    this.logger.log(`Upserting OpenAQ station: ${stationData.name} (${stationData.city})`);
    try {
      const station = await this.stationRepo.upsertFromOpenAQ(stationData);
      this.logger.log(`Station upserted successfully: ${station.name} (${station.city})`);
      return station;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to upsert OpenAQ station ${stationData.name}. Error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to sync OpenAQ station.');
    }
  }

  // -----------------------------
  // ✅ NEW: Find station by OpenAQ ID
  // -----------------------------
  async findByOpenAQId(openaqStationId: string) {
    this.logger.log(`Fetching station by OpenAQ ID: ${openaqStationId}`);
    try {
      const stations = await this.stationRepo.findAll({}); // fetch all
      return stations.find(s => s.openaqStationId === openaqStationId) || null;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to find station by OpenAQ ID ${openaqStationId}. Error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to retrieve station by OpenAQ ID.');
    }
  }

  // -----------------------------
  // ✅ NEW: Unified stations (local + OpenAQ)
  // -----------------------------
  async getUnifiedStations(
    city?: string,
    country?: string,
    source?: 'local' | 'openaq',
    page = 1,
    limit = 10,
  ) {
    this.logger.log(
      `Fetching unified stations [city=${city}, country=${country}, source=${source}, page=${page}, limit=${limit}]`,
    );
    try {
      return await this.stationRepo.findUnified(
        { city, country, source },
        { page, limit },
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch unified stations. Error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to retrieve unified stations.');
    }
  }
}
