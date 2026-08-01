import { Test } from '@nestjs/testing';
import { BadRequestException, ParseIntPipe } from '@nestjs/common';
import { AirQualityService } from '../src/air-quality/air-quality.service.js';
import { AirQualityRepository } from '../src/air-quality/air-quality.repository.js';
import { StationRepository } from '../src/stations/station.repository.js';
import { AuditLogService } from '../src/common/audit/audit-log.service.js';

describe('AirQualityService time-windowed analytics', () => {
  it('passes a 24h-ago cutoff by default to the repository', async () => {
    const aggregateByCity = jest.fn().mockResolvedValue({ _avg: { pm25: 10 }, _count: 5 });
    const module = await Test.createTestingModule({
      providers: [
        AirQualityService,
        { provide: AirQualityRepository, useValue: { aggregateByCity } },
        { provide: StationRepository, useValue: {} },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    const service = module.get(AirQualityService);
    const before = Date.now();
    const result = await service.getAveragePollutionByCity('Lagos');
    const since: Date = aggregateByCity.mock.calls[0][1];

    expect(before - since.getTime()).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000 - 1000);
    expect(result).toEqual(expect.objectContaining({ city: 'Lagos', windowHours: 24, sampleCount: 5 }));
  });

  it('flags pm25 > 15 as hazardous (WHO 2021 24h guideline) and skips null readings', async () => {
    const findAll = jest.fn().mockResolvedValue([
      { pm25: 16, pm10: null },
      { pm25: 10, pm10: null },
      { pm25: null, pm10: null },
    ]);
    const module = await Test.createTestingModule({
      providers: [
        AirQualityService,
        { provide: AirQualityRepository, useValue: { findAll } },
        { provide: StationRepository, useValue: {} },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();

    const service = module.get(AirQualityService);
    const result = await service.getHazardousReadings('Lagos');
    expect(result.length).toBe(1);
  });
});

describe('ParseIntPipe on hours query param', () => {
  it('rejects non-numeric hours value with BadRequestException', async () => {
    const pipe = new ParseIntPipe({ optional: true });
    await expect(
      pipe.transform('abc', { type: 'query', data: 'hours' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('passes undefined through when hours is not provided', async () => {
    const pipe = new ParseIntPipe({ optional: true });
    const result = await pipe.transform(undefined as any, { type: 'query', data: 'hours' });
    expect(result).toBeUndefined();
  });

  it('converts valid numeric string to number', async () => {
    const pipe = new ParseIntPipe({ optional: true });
    await expect(pipe.transform('24', { type: 'query', data: 'hours' })).resolves.toBe(24);
  });
});
