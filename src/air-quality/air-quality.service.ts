import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AirQualityReadingResponseDto } from './dto/air-quality-response.dto.js';
import { CreateAirQualityDto } from './dto/create-reading.dto.js';
import { StationRepository } from '../stations/station.repository.js';
import { AirQualityRepository } from './air-quality.repository.js';
import { AirQuality } from '@prisma/client';
import { AuditLogService } from '../common/audit/audit-log.service.js';

@Injectable()
export class AirQualityService {
  private readonly logger = new Logger(AirQualityService.name);

  private static readonly MAX_WINDOW_HOURS = 720;
  private static readonly MAX_CSV_ROWS = 1000;
  private static readonly WHO_LIMITS_UGM3: Record<string, number> = {
    pm25: 15,
    pm10: 45,
    no2: 25,
    so2: 40,
    o3: 100,
    co: 4000,
  };

  constructor(
    private readonly airQualityRepo: AirQualityRepository,
    private readonly stationRepo: StationRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  /* ----------------- DATA CREATION ----------------- */
  async createReading(
    stationId: number,
    data: {
      pm25: number | null;
      pm10: number | null;
      co: number | null;
      no2: number | null;
      o3: number | null;
      so2: number | null;
      instrumentModel?: string | null;
      calibrationDate?: Date | null;
      samplingDurationMinutes?: number | null;
      weatherConditions?: string | null;
      temperature?: number | null;
      humidity?: number | null;
    },
    source: 'local' | 'openaq' = 'local',
    userId?: string,
    measuredAt?: Date | null,
  ) {
    try {
      const station = await this.stationRepo.findById(stationId);
      if (!station) throw new NotFoundException(`Station with ID ${stationId} not found`);

      const { pm25, pm10, co, no2, o3, so2 } = data;
      const createdReading = await this.airQualityRepo.create({
        stationId,
        pm25: pm25 ?? null,
        pm10: pm10 ?? null,
        co,
        no2,
        o3,
        so2,
        source,
        measuredAt: measuredAt ?? null,
        instrumentModel: data.instrumentModel ?? null,
        calibrationDate: data.calibrationDate ?? null,
        samplingDurationMinutes: data.samplingDurationMinutes ?? null,
        weatherConditions: data.weatherConditions ?? null,
        temperature: data.temperature ?? null,
        humidity: data.humidity ?? null,
        isSuspect: false,
        suspectReason: null,
      });

      if (source === 'local') {
        await this.auditLog.log({
          userId: userId ?? 'public',
          action: 'create',
          resource: 'AirQuality',
          resourceId: createdReading.id,
          changes: { ...data, measuredAt: measuredAt ?? null },
        });
      }

      return plainToInstance(AirQualityReadingResponseDto, createdReading, { excludeExtraneousValues: true });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create reading: ${msg}`);
      throw new InternalServerErrorException('Failed to create reading.');
    }
  }

  async setSuspectFlag(id: string, isSuspect: boolean, suspectReason: string | null, userId: string) {
    try {
      const existing = await this.airQualityRepo.findById(id);
      if (!existing) throw new NotFoundException(`Reading with ID ${id} not found`);

      const updated = await this.airQualityRepo.update(id, { isSuspect, suspectReason });
      await this.auditLog.log({
        userId,
        action: 'flag_suspect',
        resource: 'AirQuality',
        resourceId: id,
        changes: { isSuspect, suspectReason },
      });
      return plainToInstance(AirQualityReadingResponseDto, updated, { excludeExtraneousValues: true });
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to set suspect flag for reading ${id}: ${msg}`);
      throw new InternalServerErrorException('Failed to update suspect flag.');
    }
  }

  /* ----------------- DATA RETRIEVAL ----------------- */
  async getReadingsByStation(stationId: number) {
    try {
      const readings = await this.airQualityRepo.findAll({ stationId });
      return plainToInstance(AirQualityReadingResponseDto, readings, { excludeExtraneousValues: true });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch readings for station ${stationId}: ${msg}`);
      throw new InternalServerErrorException('Failed to retrieve readings for station.');
    }
  }

  async getReadingsByCity(city: string) {
    try {
      const readings = await this.airQualityRepo.findAll({ city });
      return plainToInstance(AirQualityReadingResponseDto, readings, { excludeExtraneousValues: true });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch readings for city ${city}: ${msg}`);
      throw new InternalServerErrorException('Failed to retrieve readings for city.');
    }
  }

  async getLatestReadingByStation(stationId: number) {
    try {
      const latest = await this.airQualityRepo.findLatestByStation(stationId);
      if (!latest) return null;
      return plainToInstance(AirQualityReadingResponseDto, latest, { excludeExtraneousValues: true });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch latest reading for station ${stationId}: ${msg}`);
      throw new InternalServerErrorException('Failed to retrieve latest reading.');
    }
  }

  /* ----------------- DATA ANALYSIS ----------------- */
  async getAveragePollutionByCity(city: string, hours = 24) {
    const safeHours = Math.min(hours, AirQualityService.MAX_WINDOW_HOURS);
    const since = new Date(Date.now() - safeHours * 60 * 60 * 1000);
    try {
      const result = await this.airQualityRepo.aggregateByCity(city, since);
      return {
        city,
        windowHours: safeHours,
        average: result._avg,
        sampleCount: result._count,
      };
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to calculate averages for city ${city}: ${msg}`);
      throw new InternalServerErrorException('Failed to calculate averages.');
    }
  }

  async getHazardousReadings(city: string, hours = 24) {
    const safeHours = Math.min(hours, AirQualityService.MAX_WINDOW_HOURS);
    const since = new Date(Date.now() - safeHours * 60 * 60 * 1000);
    try {
      const readings = await this.airQualityRepo.findAll({ city, since });
      const withExceedances = readings.map((r) => {
        const exceedances: { pollutant: string; value: number; limit: number; factor: number }[] = [];
        for (const [pollutant, limit] of Object.entries(AirQualityService.WHO_LIMITS_UGM3)) {
          const value = (r as unknown as Record<string, number | null>)[pollutant];
          if (value !== null && value !== undefined && value > limit) {
            exceedances.push({ pollutant, value, limit, factor: Math.round((value / limit) * 10) / 10 });
          }
        }
        return { reading: r, exceedances };
      });
      const hazardous = withExceedances.filter((x) => x.exceedances.length > 0);
      return hazardous.map((x) => ({
        ...plainToInstance(AirQualityReadingResponseDto, x.reading, { excludeExtraneousValues: true }),
        stationName: x.reading.station.name,
        exceedances: x.exceedances,
      }));
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to fetch hazardous readings for city ${city}: ${msg}`);
      throw new InternalServerErrorException('Failed to fetch hazardous readings.');
    }
  }

  private static readonly DUPLICATE_WINDOW_MS = 60_000;

  async findDuplicates(city: string, hours = 24) {
    const safeHours = Math.min(hours, AirQualityService.MAX_WINDOW_HOURS);
    const since = new Date(Date.now() - safeHours * 60 * 60 * 1000);
    try {
      const readings = await this.airQualityRepo.findAll({ city, since });
      const groups = new Map<string, AirQuality[]>();

      for (const r of readings) {
        const key = `${r.stationId}|${r.pm25}|${r.pm10}|${r.co}|${r.no2}|${r.o3}|${r.so2}`;
        const group = groups.get(key) ?? [];
        group.push(r);
        groups.set(key, group);
      }

      const duplicates: { stationId: number; pollutants: Record<string, number | null>; readingIds: string[]; count: number }[] = [];
      for (const group of groups.values()) {
        if (group.length < 2) continue;
        const times = group.map((r) => (r.measuredAt ?? r.createdAt).getTime());
        const span = Math.max(...times) - Math.min(...times);
        if (span > AirQualityService.DUPLICATE_WINDOW_MS) continue;

        const [first] = group;
        duplicates.push({
          stationId: first.stationId,
          pollutants: { pm25: first.pm25, pm10: first.pm10, co: first.co, no2: first.no2, o3: first.o3, so2: first.so2 },
          readingIds: group.map((r) => r.id),
          count: group.length,
        });
      }

      return duplicates;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to find duplicates for city ${city}: ${msg}`);
      throw new InternalServerErrorException('Failed to find duplicate readings.');
    }
  }

  async bulkUploadFromCsv(rows: Record<string, string>[], userId: string) {
    if (rows.length > AirQualityService.MAX_CSV_ROWS) {
      throw new BadRequestException(
        `CSV has ${rows.length} rows, exceeding the maximum of ${AirQualityService.MAX_CSV_ROWS}`,
      );
    }

    const errors: { row: number; message: string }[] = [];
    let inserted = 0;

    for (let i = 0; i < rows.length; i++) {
      const rowNumber = i + 2; // +1 for 0-index, +1 for the header row
      const raw = rows[i];
      try {
        const stationId = Number(raw.stationId);
        if (!Number.isInteger(stationId) || stationId < 1) {
          throw new Error(`Invalid stationId "${raw.stationId}"`);
        }
        if (!raw.measuredAt) {
          throw new Error('measuredAt is required');
        }
        const measuredAt = new Date(raw.measuredAt);
        if (Number.isNaN(measuredAt.getTime())) {
          throw new Error(`Invalid measuredAt "${raw.measuredAt}"`);
        }
        if (measuredAt.getTime() > Date.now()) {
          throw new Error(`measuredAt "${raw.measuredAt}" is in the future`);
        }
        if (measuredAt.getFullYear() < 1970) {
          throw new Error(`measuredAt "${raw.measuredAt}" is implausibly old`);
        }

        const dto = plainToInstance(CreateAirQualityDto, {
          pm25: raw.pm25 ? Number(raw.pm25) : undefined,
          pm10: raw.pm10 ? Number(raw.pm10) : undefined,
          co: raw.co ? Number(raw.co) : undefined,
          no2: raw.no2 ? Number(raw.no2) : undefined,
          o3: raw.o3 ? Number(raw.o3) : undefined,
          so2: raw.so2 ? Number(raw.so2) : undefined,
          instrumentModel: raw.instrumentModel || undefined,
          calibrationDate: raw.calibrationDate || undefined,
          samplingDurationMinutes: raw.samplingDurationMinutes ? Number(raw.samplingDurationMinutes) : undefined,
          weatherConditions: raw.weatherConditions || undefined,
          temperature: raw.temperature ? Number(raw.temperature) : undefined,
          humidity: raw.humidity ? Number(raw.humidity) : undefined,
        });
        const validationErrors = await validate(dto);
        if (validationErrors.length > 0) {
          const message = validationErrors
            .map((e) => Object.values(e.constraints ?? {}).join(', '))
            .join('; ');
          throw new Error(message);
        }

        await this.createReading(
          stationId,
          {
            pm25: dto.pm25 ?? null,
            pm10: dto.pm10 ?? null,
            co: dto.co ?? null,
            no2: dto.no2 ?? null,
            o3: dto.o3 ?? null,
            so2: dto.so2 ?? null,
            instrumentModel: dto.instrumentModel ?? null,
            calibrationDate: dto.calibrationDate ? new Date(dto.calibrationDate) : null,
            samplingDurationMinutes: dto.samplingDurationMinutes ?? null,
            weatherConditions: dto.weatherConditions ?? null,
            temperature: dto.temperature ?? null,
            humidity: dto.humidity ?? null,
          },
          'local',
          userId,
          measuredAt,
        );
        inserted++;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        errors.push({ row: rowNumber, message });
      }
    }

    return { inserted, errors };
  }
}