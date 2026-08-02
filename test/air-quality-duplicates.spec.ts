// test/air-quality-duplicates.spec.ts
import { Test } from '@nestjs/testing';
import { AirQualityService } from '../src/air-quality/air-quality.service.js';
import { AirQualityRepository } from '../src/air-quality/air-quality.repository.js';
import { StationRepository } from '../src/stations/station.repository.js';
import { AuditLogService } from '../src/common/audit/audit-log.service.js';

describe('AirQualityService.findDuplicates', () => {
  const buildService = async (findAllResult: any[]) => {
    const findAll = jest.fn().mockResolvedValue(findAllResult);
    const module = await Test.createTestingModule({
      providers: [
        AirQualityService,
        { provide: AirQualityRepository, useValue: { findAll } },
        { provide: StationRepository, useValue: {} },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();
    return module.get(AirQualityService);
  };

  const base = { pm25: 12, pm10: 20, co: null, no2: null, o3: null, so2: null };

  it('groups two readings with identical pollutant values within 60 seconds', async () => {
    const t0 = new Date('2026-08-02T10:00:00.000Z');
    const t1 = new Date('2026-08-02T10:00:30.000Z'); // 30s later
    const service = await buildService([
      { id: 'a', stationId: 1, createdAt: t0, ...base },
      { id: 'b', stationId: 1, createdAt: t1, ...base },
    ]);

    const result = await service.findDuplicates('Lagos');

    expect(result.length).toBe(1);
    expect(result[0]).toEqual(
      expect.objectContaining({ stationId: 1, readingIds: expect.arrayContaining(['a', 'b']), count: 2 }),
    );
  });

  it('does not group readings more than 60 seconds apart', async () => {
    const t0 = new Date('2026-08-02T10:00:00.000Z');
    const t1 = new Date('2026-08-02T10:05:00.000Z'); // 5 minutes later
    const service = await buildService([
      { id: 'a', stationId: 1, createdAt: t0, ...base },
      { id: 'b', stationId: 1, createdAt: t1, ...base },
    ]);

    const result = await service.findDuplicates('Lagos');
    expect(result.length).toBe(0);
  });

  it('does not group readings with different pollutant values', async () => {
    const t0 = new Date('2026-08-02T10:00:00.000Z');
    const t1 = new Date('2026-08-02T10:00:10.000Z');
    const service = await buildService([
      { id: 'a', stationId: 1, createdAt: t0, ...base },
      { id: 'b', stationId: 1, createdAt: t1, ...base, pm25: 99 },
    ]);

    const result = await service.findDuplicates('Lagos');
    expect(result.length).toBe(0);
  });
});
