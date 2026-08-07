import { Test } from '@nestjs/testing';
import { AirQualityService } from '../src/air-quality/air-quality.service.js';
import { AirQualityRepository } from '../src/air-quality/air-quality.repository.js';
import { StationRepository } from '../src/stations/station.repository.js';
import { AuditLogService } from '../src/common/audit/audit-log.service.js';

describe('AirQualityService.createReading measuredAt', () => {
  const buildService = async () => {
    const findById = jest.fn().mockResolvedValue({ id: 1 });
    const create = jest.fn().mockResolvedValue({ id: 'r1', stationId: 1 });
    const module = await Test.createTestingModule({
      providers: [
        AirQualityService,
        { provide: AirQualityRepository, useValue: { create } },
        { provide: StationRepository, useValue: { findById } },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();
    return { service: module.get(AirQualityService), create };
  };

  const reading = { pm25: 10, pm10: null, co: null, no2: null, o3: null, so2: null };

  it('passes measuredAt through to the repository when provided', async () => {
    const { service, create } = await buildService();
    const measuredAt = new Date('2026-07-15T09:00:00.000Z');

    await service.createReading(1, reading, 'local', 'public', measuredAt);

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ measuredAt }));
  });

  it('defaults measuredAt to null when omitted', async () => {
    const { service, create } = await buildService();

    await service.createReading(1, reading, 'local', 'public');

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ measuredAt: null }));
  });
});
