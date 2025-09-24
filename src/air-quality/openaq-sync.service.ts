import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OpenAQService } from '../openaq/openaq.service';
import fetch from 'node-fetch';

@Injectable()
export class OpenAQSyncService {
  private readonly logger = new Logger(OpenAQSyncService.name);

  constructor(private readonly openAQService: OpenAQService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleOpenAQSync() {
    this.logger.log('Starting OpenAQ sync via Cron job...');

    try {
      const paramResponse = await fetch('https://api.openaq.org/v2/parameters');
      const paramData = (await paramResponse.json()) as { results: any[] };
      const parameters = paramData.results.map((p) => ({
        id: p.id,
        name: p.name,
        displayName: p.displayName,
        units: p.unit,
        description: p.description,
      }));

      const measurementResponse = await fetch('https://api.openaq.org/v2/latest?limit=10000');
      const measurementData = (await measurementResponse.json()) as { results: any[] };

      const measurements: {
        stationId: number;
        parameterId: number;
        value: number;
        dateUtc: string;
      }[] = [];

      for (const record of measurementData.results) {
        const station = await this.openAQService.findStationByNameAndCity(
          record.location,
          record.city,
        );
        if (!station) continue;

        for (const m of record.measurements) {
          measurements.push({
            stationId: station.id,
            parameterId: m.parameterId,
            value: m.value,
            dateUtc: m.lastUpdated,
          });
        }
      }

      await this.openAQService.fullOpenAQSync({ parameters, measurements });
      this.logger.log('OpenAQ sync completed successfully.');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`OpenAQ sync failed. Error: ${errorMessage}`);
    }
  }
}
