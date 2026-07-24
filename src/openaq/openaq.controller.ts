import { Controller, Post, Body, Logger, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { ApiKeyGuard } from '../common/guards/api-key.guard.js';
import { OpenAQService } from './openaq.service.js';
import { OpenAQParameterDto } from './dto/openaq-parameter.dto.js';
import { OpenAQMeasurementDto } from './dto/openaq-measurement.dto.js';

@ApiTags('OpenAQ')
@Controller('openaq')
@UseGuards(ApiKeyGuard)
@ApiHeader({ name: 'x-api-key', required: true, description: 'Admin API key' })
export class OpenAQController {
  private readonly logger = new Logger(OpenAQController.name);

  constructor(private readonly openAQService: OpenAQService) {}

  @Post('parameters/sync')
  @ApiOperation({ summary: 'Sync OpenAQ parameters (requires admin API key)' })
  @ApiResponse({ status: 201, description: 'Parameters synced successfully.' })
  async syncParameters(@Body() params: OpenAQParameterDto[]) {
    this.logger.log(`Received request to sync ${params.length} parameters.`);
    return this.openAQService.syncParameters(params);
  }

  @Post('measurements/sync')
  @ApiOperation({ summary: 'Sync OpenAQ measurements (requires admin API key)' })
  @ApiResponse({ status: 201, description: 'Measurements synced successfully.' })
  async syncMeasurements(@Body() measurements: OpenAQMeasurementDto[]) {
    this.logger.log(`Received request to sync ${measurements.length} measurements.`);
    return this.openAQService.syncMeasurements(measurements);
  }

  @Post('full-sync')
  @ApiOperation({ summary: 'Full sync: parameters + measurements (requires admin API key)' })
  @ApiResponse({ status: 201, description: 'Full OpenAQ sync completed.' })
  async fullSync(
    @Body() data: { parameters: OpenAQParameterDto[]; measurements: OpenAQMeasurementDto[] },
  ) {
    this.logger.log(`Received request for full OpenAQ sync.`);
    return this.openAQService.fullOpenAQSync(data);
  }
}
