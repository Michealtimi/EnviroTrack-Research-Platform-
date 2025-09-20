import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { StationService } from './station.service.js';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { CreateStationDto, UpdateStationDto } from './dto/create-station.dto.js';


@ApiTags('stations')
@Controller('stations')
export class StationController {
  private readonly logger = new Logger(StationController.name);

  constructor(private readonly stationService: StationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new station' })
  @ApiBody({ type: CreateStationDto })
  async create(@Body() body: CreateStationDto) {
    this.logger.log(`Request to create station with data: ${JSON.stringify(body)}`);
    return this.stationService.createStation(body);
  }

  @Get()
  @ApiOperation({ summary: 'Get all stations' })
  async findAll() {
    this.logger.log('Request to get all stations');
    return this.stationService.getAllStations();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get station by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Request to get station by ID: ${id}`);
    return this.stationService.getStationById(id);
  }

  @Get('city/:city')
  @ApiOperation({ summary: 'Get stations in a city' })
  async findByCity(@Param('city') city: string) {
    this.logger.log(`Request to get stations by city: ${city}`);
    return this.stationService.getStationsByCity(city);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a station' })
  @ApiBody({ type: UpdateStationDto })
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateStationDto) {
    this.logger.log(`Request to update station with ID: ${id}`);
    return this.stationService.updateStation(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a station' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Request to delete station with ID: ${id}`);
    return this.stationService.deleteStation(id);
  }
}