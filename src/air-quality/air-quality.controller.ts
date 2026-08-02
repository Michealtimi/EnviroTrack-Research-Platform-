// src/air-quality/air-quality.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  ParseIntPipe,
  Req,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiBody, ApiQuery, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { CreateAirQualityDto } from './dto/create-reading.dto.js';
import { HazardousReadingResponseDto } from './dto/air-quality-response.dto.js';
import { SetSuspectDto } from './dto/set-suspect.dto.js';
import { AirQualityService } from './air-quality.service.js';
import { isAdminRequest, ApiKeyGuard } from '../common/guards/api-key.guard.js';

@ApiTags('air-quality')
@Controller('air-quality')
export class AirQualityController {
  private readonly logger = new Logger(AirQualityController.name);

  constructor(
    private readonly airQualityService: AirQualityService,
    private readonly configService: ConfigService,
  ) {}

  @Post('station/:stationId')
  @ApiOperation({ summary: 'Create a new air quality reading for a station' })
  @ApiBody({ type: CreateAirQualityDto })
  async create(
    @Param('stationId', ParseIntPipe) stationId: number,
    @Body() body: CreateAirQualityDto,
    @Req() req: Request,
  ) {
    this.logger.log(`Request to create reading for station ID: ${stationId}`);
    const readingData = {
      pm25: body.pm25 ?? null,
      pm10: body.pm10 ?? null,
      co: body.co ?? null,
      no2: body.no2 ?? null,
      o3: body.o3 ?? null,
      so2: body.so2 ?? null,
      instrumentModel: body.instrumentModel ?? null,
      calibrationDate: body.calibrationDate ? new Date(body.calibrationDate) : null,
      samplingDurationMinutes: body.samplingDurationMinutes ?? null,
      weatherConditions: body.weatherConditions ?? null,
      temperature: body.temperature ?? null,
      humidity: body.humidity ?? null,
    };
    const userId = isAdminRequest(req.headers, this.configService) ? 'admin' : 'public';
    return this.airQualityService.createReading(stationId, readingData, 'local', userId);
  }

  @Patch(':id/suspect')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({ name: 'x-api-key', required: true, description: 'Admin API key' })
  @ApiOperation({ summary: 'Flag or unflag a reading as suspect (requires admin API key)' })
  @ApiBody({ type: SetSuspectDto })
  async setSuspect(@Param('id') id: string, @Body() body: SetSuspectDto) {
    this.logger.log(`Request to set suspect flag on reading ${id}: ${body.isSuspect}`);
    // ApiKeyGuard already rejected this request if the key didn't match - always "admin" here.
    return this.airQualityService.setSuspectFlag(id, body.isSuspect, body.suspectReason ?? null, 'admin');
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
  async averageByCity(@Param('city') city: string, @Query('hours', new ParseIntPipe({ optional: true })) hours?: number) {
    this.logger.log(`Request to get average pollution for city: ${city}`);
    return this.airQualityService.getAveragePollutionByCity(city, hours);
  }

  @Get('city/:city/hazardous')
  @ApiOperation({ summary: 'Get hazardous readings by city over a recent window (default 24h, WHO 2021 guideline values)' })
  @ApiQuery({ name: 'hours', required: false, type: Number })
  @ApiResponse({ status: 200, type: [HazardousReadingResponseDto] })
  async hazardous(@Param('city') city: string, @Query('hours', new ParseIntPipe({ optional: true })) hours?: number) {
    this.logger.log(`Request to get hazardous readings for city: ${city}`);
    return this.airQualityService.getHazardousReadings(city, hours);
  }

  @Get('city/:city/duplicates')
  @ApiOperation({ summary: 'Find candidate duplicate readings for a city (same station, identical pollutant values, within 60s)' })
  async duplicates(@Param('city') city: string) {
    this.logger.log(`Request to find duplicate readings for city: ${city}`);
    return this.airQualityService.findDuplicates(city);
  }

  @Get('station/:stationId/latest')
  @ApiOperation({ summary: 'Get latest reading by station ID' })
  async latestByStation(@Param('stationId', ParseIntPipe) stationId: number) {
    this.logger.log(`Request to get latest reading for station ID: ${stationId}`);
    return this.airQualityService.getLatestReadingByStation(stationId);
  }
}