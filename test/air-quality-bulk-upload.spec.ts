import { Test } from '@nestjs/testing';
import { AirQualityService } from '../src/air-quality/air-quality.service.js';
import { AirQualityRepository } from '../src/air-quality/air-quality.repository.js';
import { StationRepository } from '../src/stations/station.repository.js';
import { AuditLogService } from '../src/common/audit/audit-log.service.js';

describe('AirQualityService.bulkUploadFromCsv', () => {
  const buildService = async (findByIdImpl: (id: number) => any = () => ({ id: 1 })) => {
    const findById = jest.fn().mockImplementation(findByIdImpl);
    const create = jest.fn().mockResolvedValue({ id: 'r1', stationId: 1 });
    const module = await Test.createTestingModule({
      providers: [
        AirQualityService,
        { provide: AirQualityRepository, useValue: { create } },
        { provide: StationRepository, useValue: { findById } },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();
    return module.get(AirQualityService);
  };

  it('inserts every valid row and reports zero errors', async () => {
    const service = await buildService();
    const rows = [
      { stationId: '1', measuredAt: '2026-07-15T09:00:00.000Z', pm25: '12', pm10: '20' },
      { stationId: '1', measuredAt: '2026-07-15T10:00:00.000Z', pm25: '14', pm10: '22' },
    ];

    const result = await service.bulkUploadFromCsv(rows, 'public');

    expect(result).toEqual({ inserted: 2, errors: [] });
  });

  it('reports a per-row error for an invalid stationId and still inserts the valid rows', async () => {
    const service = await buildService();
    const rows = [
      { stationId: 'not-a-number', measuredAt: '2026-07-15T09:00:00.000Z', pm25: '12' },
      { stationId: '1', measuredAt: '2026-07-15T10:00:00.000Z', pm25: '14' },
    ];

    const result = await service.bulkUploadFromCsv(rows, 'public');

    expect(result.inserted).toBe(1);
    expect(result.errors).toEqual([{ row: 2, message: expect.stringContaining('stationId') }]);
  });

  it('reports a per-row error for a missing measuredAt', async () => {
    const service = await buildService();
    const rows = [{ stationId: '1', measuredAt: '', pm25: '12' }];

    const result = await service.bulkUploadFromCsv(rows, 'public');

    expect(result.inserted).toBe(0);
    expect(result.errors).toEqual([{ row: 2, message: expect.stringContaining('measuredAt') }]);
  });

  it('reports a per-row error when the station does not exist, via createReading\'s own 404', async () => {
    const service = await buildService(() => null);
    const rows = [{ stationId: '999', measuredAt: '2026-07-15T09:00:00.000Z', pm25: '12' }];

    const result = await service.bulkUploadFromCsv(rows, 'public');

    expect(result.inserted).toBe(0);
    expect(result.errors).toEqual([{ row: 2, message: expect.stringContaining('999') }]);
  });

  it('rejects an oversized upload outright, before processing any row', async () => {
    const service = await buildService();
    const rows = Array.from({ length: 1001 }, (_, i) => ({ stationId: '1', measuredAt: '2026-07-15T09:00:00.000Z', pm25: String(i) }));

    await expect(service.bulkUploadFromCsv(rows, 'public')).rejects.toThrow('1000');
  });

  it('reports a per-row error for a measuredAt in the future', async () => {
    const service = await buildService();
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const rows = [{ stationId: '1', measuredAt: future, pm25: '12' }];

    const result = await service.bulkUploadFromCsv(rows, 'public');

    expect(result.inserted).toBe(0);
    expect(result.errors).toEqual([{ row: 2, message: expect.stringContaining('future') }]);
  });

  it('returns an empty summary for a header-only (zero-row) upload', async () => {
    const service = await buildService();

    const result = await service.bulkUploadFromCsv([], 'public');

    expect(result).toEqual({ inserted: 0, errors: [] });
  });
});
