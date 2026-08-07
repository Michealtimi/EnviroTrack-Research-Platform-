import { Test } from '@nestjs/testing';
import { AirQualityService } from '../src/air-quality/air-quality.service.js';
import { AirQualityRepository } from '../src/air-quality/air-quality.repository.js';
import { StationRepository } from '../src/stations/station.repository.js';
import { StationService } from '../src/stations/station.service.js';
import { AuditLogService } from '../src/common/audit/audit-log.service.js';

describe('measuredAt-aware windowing', () => {
  it('findAll filters by measuredAt when present, createdAt as fallback', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const { AirQualityRepository: RealRepo } = await import('../src/air-quality/air-quality.repository.js');
    const { PrismaService } = await import('../src/prisma/prisma.service.js');
    const repo = new RealRepo({ airQuality: { findMany } } as unknown as InstanceType<typeof PrismaService>);
    const since = new Date('2026-07-01T00:00:00.000Z');

    await repo.findAll({ city: 'Lagos', since });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { measuredAt: { gte: since } },
            { measuredAt: null, createdAt: { gte: since } },
          ],
        }),
      }),
    );
  });

  it('findDuplicates groups by measuredAt span when present, not createdAt', async () => {
    // measuredAt identical (same field-trip day), createdAt hours apart (re-uploaded later)
    const measuredAt = new Date('2026-07-15T09:00:00.000Z');
    const readings = [
      { id: 'a', stationId: 1, pm25: 12, pm10: 20, co: null, no2: null, o3: null, so2: null, measuredAt, createdAt: new Date('2026-07-15T09:05:00.000Z') },
      { id: 'b', stationId: 1, pm25: 12, pm10: 20, co: null, no2: null, o3: null, so2: null, measuredAt, createdAt: new Date('2026-07-16T14:00:00.000Z') },
    ];
    const findAll = jest.fn().mockResolvedValue(readings);
    const module = await Test.createTestingModule({
      providers: [
        AirQualityService,
        { provide: AirQualityRepository, useValue: { findAll } },
        { provide: StationRepository, useValue: {} },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();
    const service = module.get(AirQualityService);

    const result = await service.findDuplicates('Lagos');

    expect(result.length).toBe(1);
    expect(result[0].count).toBe(2);
  });

  it('getCompleteness buckets by measuredAt when present, not createdAt', async () => {
    const findById = jest.fn().mockResolvedValue({ id: 1, source: 'openaq' });
    // All three readings synced (createdAt) within the same minute, but measuredAt
    // spread across 3 distinct hours - completeness should reflect the real spread.
    const now = new Date();
    const readings = [
      { createdAt: now, measuredAt: new Date('2026-08-01T00:15:00.000Z') },
      { createdAt: now, measuredAt: new Date('2026-08-01T01:05:00.000Z') },
      { createdAt: now, measuredAt: new Date('2026-08-01T02:00:00.000Z') },
    ];
    const findAll = jest.fn().mockResolvedValue(readings);
    const module = await Test.createTestingModule({
      providers: [
        StationService,
        { provide: StationRepository, useValue: { findById } },
        { provide: AirQualityRepository, useValue: { findAll } },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();
    const service = module.get(StationService);

    const result = await service.getCompleteness(1, 24);

    expect(result).toEqual(
      expect.objectContaining({ applicable: true, hoursWithReadings: 3 }),
    );
  });
});
