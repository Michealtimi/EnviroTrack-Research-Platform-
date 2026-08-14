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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBody, ApiQuery, ApiResponse, ApiHeader, ApiConsumes } from '@nestjs/swagger';
import { parse } from 'csv-parse/sync';
import { CreateAirQualityDto } from './dto/create-reading.dto.js';
import { HazardousReadingResponseDto } from './dto/air-quality-response.dto.js';
import { SetSuspectDto } from './dto/set-suspect.dto.js';
import { AirQualityService } from './air-quality.service.js';
import { isAdminRequest, ApiKeyGuard } from '../common/guards/api-key.guard.js';
import { formatHazardousReadingsAsCsv } from './hazardous-csv.util.js';

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

  @Post('bulk-upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } })) // 2MB - well over 1000 rows of CSV text
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiOperation({ summary: 'Bulk-upload readings from a CSV file (columns: stationId, measuredAt required; pollutants and metadata optional)' })
  async bulkUpload(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) throw new BadRequestException('No file uploaded');

    let records: Record<string, string>[];
    try {
      records = parse(file.buffer, { columns: true, skip_empty_lines: true, trim: true });
    } catch (err: unknown) {
      throw new BadRequestException(`Could not parse CSV: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }

    const userId = isAdminRequest(req.headers, this.configService) ? 'admin' : 'public';
    return this.airQualityService.bulkUploadFromCsv(records, userId);
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
  @ApiOperation({ summary: 'Get hazardous readings by city over a recent window (default 24h, WHO 2021 guideline values). Add ?format=csv for a CSV download.' })
  @ApiQuery({ name: 'hours', required: false, type: Number })
  @ApiQuery({ name: 'format', required: false, description: 'Set to "csv" for a CSV download instead of JSON' })
  @ApiResponse({ status: 200, type: [HazardousReadingResponseDto] })
  async hazardous(
    @Param('city') city: string,
    @Query('hours', new ParseIntPipe({ optional: true })) hours: number | undefined,
    @Query('format') format: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.logger.log(`Request to get hazardous readings for city: ${city}`);
    const readings = await this.airQualityService.getHazardousReadings(city, hours);

    if (format === 'csv') {
      const csv = formatHazardousReadingsAsCsv(readings);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="hazardous-${city}.csv"`);
      res.send(csv);
      return;
    }

    return readings;
  }

  @Get('city/:city/duplicates')
  @ApiOperation({ summary: 'Find candidate duplicate readings for a city over a recent window (default 24h, same station, identical pollutant values, within 60s)' })
  @ApiQuery({ name: 'hours', required: false, type: Number })
  async duplicates(@Param('city') city: string, @Query('hours', new ParseIntPipe({ optional: true })) hours?: number) {
    this.logger.log(`Request to find duplicate readings for city: ${city}`);
    return this.airQualityService.findDuplicates(city, hours);
  }

  @Get('station/:stationId/latest')
  @ApiOperation({ summary: 'Get latest reading by station ID' })
  async latestByStation(@Param('stationId', ParseIntPipe) stationId: number) {
    this.logger.log(`Request to get latest reading for station ID: ${stationId}`);
    return this.airQualityService.getLatestReadingByStation(stationId);
  }
}