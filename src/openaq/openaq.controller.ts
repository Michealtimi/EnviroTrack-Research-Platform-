import { Controller, Post, Body, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AirQualityService } from '../air-quality/air-quality.service.js';
import { OpenAQParameterDto } from './dto/openaq-parameter.dto.js';
import { OpenAQMeasurementDto } from './dto/openaq-measurement.dto.js';

@ApiTags('OpenAQ') // Group in Swagger UI
@Controller('openaq')
export class OpenAQController {
  private readonly logger = new Logger(OpenAQController.name);

  constructor(private readonly airQualityService: AirQualityService) {}

  @Post('parameters/sync')
  @ApiOperation({ summary: 'Sync OpenAQ parameters' })
  @ApiResponse({ status: 201, description: 'Parameters synced successfully.' })
  async syncParameters(@Body() params: OpenAQParameterDto[]) {
    this.logger.log(`Received request to sync ${params.length} parameters.`);
    return this.airQualityService.syncOpenAQParameters(params);
  }

  @Post('measurements/sync')
  @ApiOperation({ summary: 'Sync OpenAQ measurements' })
  @ApiResponse({ status: 201, description: 'Measurements synced successfully.' })
  async syncMeasurements(@Body() measurements: OpenAQMeasurementDto[]) {
    this.logger.log(`Received request to sync ${measurements.length} measurements.`);
    return this.airQualityService.syncOpenAQMeasurements(measurements);
  }

  @Post('full-sync')
  @ApiOperation({ summary: 'Full sync: parameters + measurements' })
  @ApiResponse({ status: 201, description: 'Full OpenAQ sync completed.' })
  async fullSync(
    @Body() data: { parameters: OpenAQParameterDto[]; measurements: OpenAQMeasurementDto[] },
  ) {
    this.logger.log(`Received request for full OpenAQ sync.`);
    return this.airQualityService.fullOpenAQSync(data);
  }
}
