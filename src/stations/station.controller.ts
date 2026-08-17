import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  Query,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { StationService } from './station.service.js';
import { ApiTags, ApiOperation, ApiBody, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { CreateStationDto, UpdateStationDto } from './dto/create-station.dto.js';
import { UnifiedStationQueryDto } from './dto/unified-station-query.dto.js';
import { ApiKeyGuard } from '../common/guards/api-key.guard.js';

@ApiTags('stations')
@Controller('stations')
export class StationController {
  private readonly logger = new Logger(StationController.name);

  constructor(private readonly stationService: StationService) {}

  // -----------------------------
  // ✅ Create station
  // -----------------------------
  @Post()
  @ApiOperation({ summary: 'Create a new station' })
  @ApiBody({ type: CreateStationDto })
  async create(@Body() body: CreateStationDto) {
    this.logger.log(`Request to create station with data: ${JSON.stringify(body)}`);
    return this.stationService.createStation(body);
  }

  // -----------------------------
  // ✅ Get all local stations
  // -----------------------------
  @Get()
  @ApiOperation({ summary: 'Get all stations' })
  async findAll() {
    this.logger.log('Request to get all stations');
    return this.stationService.getAllStations();
  }

  // -----------------------------
  // ✅ Get stations by city
  // -----------------------------
  @Get('city/:city')
  @ApiOperation({ summary: 'Get stations in a city' })
  async findByCity(@Param('city') city: string) {
    this.logger.log(`Request to get stations by city: ${city}`);
    return this.stationService.getStationsByCity(city);
  }

  // -----------------------------
  // ✅ NEW: Unified stations endpoint
  // -----------------------------
  @Get('unified')
  @ApiOperation({ summary: 'Get unified list of stations (local + OpenAQ)' })
  async getUnifiedStations(@Query() query: UnifiedStationQueryDto) {
    this.logger.log(`Request to get unified stations ${JSON.stringify(query)}`);
    return this.stationService.getUnifiedStations(
      query.city,
      query.country,
      query.source,
      query.page,
      query.limit,
    );
  }

  // -----------------------------
  // ✅ NEW: Reporting completeness for OpenAQ-synced stations
  // -----------------------------
  @Get(':id/completeness')
  @ApiOperation({ summary: 'Get reporting completeness for an OpenAQ-synced station over a recent window (default 24h)' })
  @ApiQuery({ name: 'hours', required: false, type: Number })
  async completeness(@Param('id', ParseIntPipe) id: number, @Query('hours', new ParseIntPipe({ optional: true })) hours?: number) {
    this.logger.log(`Request for completeness on station ${id}`);
    return this.stationService.getCompleteness(id, hours);
  }

  // -----------------------------
  // ✅ Get station by ID
  // -----------------------------
  @Get(':id')
  @ApiOperation({ summary: 'Get station by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Request to get station by ID: ${id}`);
    return this.stationService.getStationById(id);
  }

  // -----------------------------
  // ✅ Update station
  // -----------------------------
  @Patch(':id')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({ name: 'x-api-key', required: true, description: 'Admin API key' })
  @ApiOperation({ summary: 'Update a station (requires admin API key)' })
  @ApiBody({ type: UpdateStationDto })
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateStationDto) {
    this.logger.log(`Request to update station with ID: ${id}`);
    // ApiKeyGuard already rejected this request if the key didn't match - always "admin" here.
    return this.stationService.updateStation(id, body, 'admin');
  }

  // -----------------------------
  // ✅ Delete station
  // -----------------------------
  @Delete(':id')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({ name: 'x-api-key', required: true, description: 'Admin API key' })
  @ApiOperation({ summary: 'Delete a station (requires admin API key)' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Request to delete station with ID: ${id}`);
    // ApiKeyGuard already rejected this request if the key didn't match - always "admin" here.
    return this.stationService.deleteStation(id, 'admin');
  }
}