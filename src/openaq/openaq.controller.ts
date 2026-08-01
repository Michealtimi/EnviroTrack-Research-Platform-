import { Controller, Get, Post, Body, Query, Logger, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { ApiKeyGuard } from '../common/guards/api-key.guard.js';
import { OpenAQService } from './openaq.service.js';
import { OpenAQParameterDto } from './dto/openaq-parameter.dto.js';
import { OpenAQMeasurementDto } from './dto/openaq-measurement.dto.js';
import { SyncHistoryQueryDto } from './dto/sync-history-query.dto.js';

@ApiTags('OpenAQ')
@Controller('openaq')
export class OpenAQController {
  private readonly logger = new Logger(OpenAQController.name);

  constructor(private readonly openAQService: OpenAQService) {}

  @Post('parameters/sync')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({ name: 'x-api-key', required: true, description: 'Admin API key' })
  @ApiOperation({ summary: 'Sync OpenAQ parameters (requires admin API key)' })
  @ApiResponse({ status: 201, description: 'Parameters synced successfully.' })
  async syncParameters(@Body() params: OpenAQParameterDto[]) {
    this.logger.log(`Received request to sync ${params.length} parameters.`);
    return this.openAQService.syncParameters(params);
  }

  @Post('measurements/sync')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({ name: 'x-api-key', required: true, description: 'Admin API key' })
  @ApiOperation({ summary: 'Sync OpenAQ measurements (requires admin API key)' })
  @ApiResponse({ status: 201, description: 'Measurements synced successfully.' })
  async syncMeasurements(@Body() measurements: OpenAQMeasurementDto[]) {
    this.logger.log(`Received request to sync ${measurements.length} measurements.`);
    return this.openAQService.syncMeasurements(measurements);
  }

  @Post('full-sync')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({ name: 'x-api-key', required: true, description: 'Admin API key' })
  @ApiOperation({ summary: 'Full sync: parameters + measurements (requires admin API key)' })
  @ApiResponse({ status: 201, description: 'Full OpenAQ sync completed.' })
  async fullSync(
    @Body() data: { parameters: OpenAQParameterDto[]; measurements: OpenAQMeasurementDto[] },
  ) {
    this.logger.log(`Received request for full OpenAQ sync.`);
    return this.openAQService.fullOpenAQSync(data);
  }

  @Get('sync-history')
  @ApiOperation({ summary: 'Get recent OpenAQ sync run history (public, read-only)' })
  async syncHistory(@Query() query: SyncHistoryQueryDto) {
    this.logger.log(`Request for OpenAQ sync history [limit=${query.limit}]`);
    return this.openAQService.getSyncHistory(query.limit);
  }
}
