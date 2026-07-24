import { Test } from '@nestjs/testing';
import { AirQualityService } from '../src/air-quality/air-quality.service.js';
import { AirQualityRepository } from '../src/air-quality/air-quality.repository.js';
import { StationRepository } from '../src/stations/station.repository.js';

describe('AirQualityService time-windowed analytics', () => {
  it('passes a 24h-ago cutoff by default to the repository', async () => {
    const aggregateByCity = jest.fn().mockResolvedValue({ _avg: { pm25: 10 }, _count: 5 });
    const module = await Test.createTestingModule({
      providers: [
        AirQualityService,
        { provide: AirQualityRepository, useValue: { aggregateByCity } },
        { provide: StationRepository, useValue: {} },
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
      ],
    }).compile();

    const service = module.get(AirQualityService);
    const result = await service.getHazardousReadings('Lagos');
    expect(result.length).toBe(1);
  });
});
