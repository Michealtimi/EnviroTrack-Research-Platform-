// src/air-quality/air-quality.controller.ts
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseIntPipe,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiQuery } from '@nestjs/swagger';
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
    const readingData = {
      pm25: body.pm25 ?? null,
      pm10: body.pm10 ?? null,
      co: body.co ?? null,
      no2: body.no2 ?? null,
      o3: body.o3 ?? null,
      so2: body.so2 ?? null,
    };
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
  @ApiOperation({ summary: 'Get average pollution by city over a recent window (default 24h)' })
  @ApiQuery({ name: 'hours', required: false, type: Number })
  async averageByCity(@Param('city') city: string, @Query('hours') hours?: number) {
    this.logger.log(`Request to get average pollution for city: ${city}`);
    return this.airQualityService.getAveragePollutionByCity(city, hours ? Number(hours) : undefined);
  }

  @Get('city/:city/hazardous')
  @ApiOperation({ summary: 'Get hazardous readings by city over a recent window (default 24h, WHO 2021 24h guideline)' })
  @ApiQuery({ name: 'hours', required: false, type: Number })
  async hazardous(@Param('city') city: string, @Query('hours') hours?: number) {
    this.logger.log(`Request to get hazardous readings for city: ${city}`);
    return this.airQualityService.getHazardousReadings(city, hours ? Number(hours) : undefined);
  }

  @Get('station/:stationId/latest')
  @ApiOperation({ summary: 'Get latest reading by station ID' })
  async latestByStation(@Param('stationId', ParseIntPipe) stationId: number) {
    this.logger.log(`Request to get latest reading for station ID: ${stationId}`);
    return this.airQualityService.getLatestReadingByStation(stationId);
  }
}