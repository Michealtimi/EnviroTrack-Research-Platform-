// test/air-quality-exceedance.spec.ts
import { Test } from '@nestjs/testing';
import { AirQualityService } from '../src/air-quality/air-quality.service.js';
import { AirQualityRepository } from '../src/air-quality/air-quality.repository.js';
import { StationRepository } from '../src/stations/station.repository.js';
import { AuditLogService } from '../src/common/audit/audit-log.service.js';

describe('AirQualityService exceedance factors', () => {
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

  it('computes exceedance factors for every pollutant over its WHO limit', async () => {
    const service = await buildService([
      { id: 'r1', pm25: 18, pm10: null, co: null, no2: 325, o3: null, so2: null, station: { name: 'Station A' } },
    ]);

    const [result] = await service.getHazardousReadings('Lagos');

    expect(result.exceedances).toEqual(
      expect.arrayContaining([
        { pollutant: 'pm25', value: 18, limit: 15, factor: 1.2 },
        { pollutant: 'no2', value: 325, limit: 25, factor: 13 },
      ]),
    );
    expect(result.exceedances.length).toBe(2);
  });

  it('excludes a reading where every pollutant is within its limit', async () => {
    const service = await buildService([
      { id: 'r2', pm25: 10, pm10: 20, co: 100, no2: 5, o3: 10, so2: 2 },
    ]);

    const result = await service.getHazardousReadings('Lagos');

    expect(result.length).toBe(0);
  });

  it('skips null pollutant values without crashing', async () => {
    const service = await buildService([
      { id: 'r3', pm25: null, pm10: null, co: null, no2: null, o3: null, so2: null },
    ]);

    const result = await service.getHazardousReadings('Lagos');

    expect(result.length).toBe(0);
  });
});
