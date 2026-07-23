// src/air-quality/air-quality.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { CreateAirQualityDto } from './dto/create-reading.dto.js';
import { AirQualityService } from './air-quality.service.js';

@ApiTags('air-quality')
@Controller('air-quality')
export class AirQualityController {
  private readonly logger = new Logger(AirQualityController.name);

  constructor(private readonly airQualityService: AirQualityService) {}

  @Post('station/:stationId')
  @ApiOperation({ summary: 'Create a new air quality reading for a station' })
  @ApiBody({ type: CreateAirQualityDto })
  async create(
    @Param('stationId', ParseIntPipe) stationId: number,
    @Body() body: CreateAirQualityDto,
  ) {
    this.logger.log(`Request to create reading for station ID: ${stationId}`);
    // The `createReading` service method expects an `o3` property, which is missing
    // from `CreateAirQualityDto`. We'll add it here, defaulting to `null` as it's
    // optional in the database schema.
    const readingData = { ...body, o3: (body as any).o3 ?? null };
    return this.airQualityService.createReading(stationId, readingData);
  }

  @Get('station/:stationId')
  @ApiOperation({ summary: 'Get all readings by station ID' })
  async findByStation(@Param('stationId', ParseIntPipe) stationId: number) {
    this.logger.log(`Request to get all readings for station ID: ${stationId}`);
    return this.airQualityService.getReadingsByStation(stationId);
  }

  @Get('city/:city')
  @ApiOperation({ summary: 'Get all readings by city' })
  async findByCity(@Param('city') city: string) {
    this.logger.log(`Request to get all readings for city: ${city}`);
    return this.airQualityService.getReadingsByCity(city);
  }

  @Get('city/:city/average')
  @ApiOperation({ summary: 'Get average pollution by city' })
  async averageByCity(@Param('city') city: string) {
    this.logger.log(`Request to get average pollution for city: ${city}`);
    return this.airQualityService.getAveragePollutionByCity(city);
  }

  @Get('city/:city/hazardous')
  @ApiOperation({ summary: 'Get hazardous readings by city' })
  async hazardous(@Param('city') city: string) {
    this.logger.log(`Request to get hazardous readings for city: ${city}`);
    return this.airQualityService.getHazardousReadings(city);
  }

  @Get('station/:stationId/latest')
  @ApiOperation({ summary: 'Get latest reading by station ID' })
  async latestByStation(@Param('stationId', ParseIntPipe) stationId: number) {
    this.logger.log(`Request to get latest reading for station ID: ${stationId}`);
    return this.airQualityService.getLatestReadingByStation(stationId);
  }
}