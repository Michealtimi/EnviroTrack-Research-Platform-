import { Test } from '@nestjs/testing';
import { StationService } from '../src/stations/station.service.js';
import { StationRepository } from '../src/stations/station.repository.js';
import { AirQualityRepository } from '../src/air-quality/air-quality.repository.js';
import { AuditLogService } from '../src/common/audit/audit-log.service.js';

describe('StationService.getCompleteness', () => {
  const buildService = async (station: any, readings: any[]) => {
    const findById = jest.fn().mockResolvedValue(station);
    const findAll = jest.fn().mockResolvedValue(readings);
    const module = await Test.createTestingModule({
      providers: [
        StationService,
        { provide: StationRepository, useValue: { findById } },
        { provide: AirQualityRepository, useValue: { findAll } },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();
    return { service: module.get(StationService), findAll };
  };

  it('returns applicable: false for a local station', async () => {
    const { service } = await buildService({ id: 1, source: 'local' }, []);
    const result = await service.getCompleteness(1, 24);
    expect(result).toEqual({ applicable: false, stationId: 1 });
  });

  it('computes completeness percent for an openaq station', async () => {
    // 24-hour window, readings in 3 distinct hour-buckets out of 24
    const readings = [
      { createdAt: new Date('2026-08-02T00:15:00.000Z') },
      { createdAt: new Date('2026-08-02T01:05:00.000Z') },
      { createdAt: new Date('2026-08-02T01:50:00.000Z') }, // same hour bucket as above
      { createdAt: new Date('2026-08-02T02:00:00.000Z') },
    ];
    const { service, findAll } = await buildService({ id: 2, source: 'openaq' }, readings);

    const result = await service.getCompleteness(2, 24);

    expect(findAll).toHaveBeenCalledWith(expect.objectContaining({ stationId: 2 }));
    expect(result).toEqual({
      applicable: true,
      stationId: 2,
      windowHours: 24,
      hoursWithReadings: 3,
      completenessPercent: 12.5, // 3/24 * 100, rounded to 1 decimal
    });
  });
});
