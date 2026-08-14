import { Test } from '@nestjs/testing';
import { AirQualityService } from '../src/air-quality/air-quality.service.js';
import { AirQualityRepository } from '../src/air-quality/air-quality.repository.js';
import { StationRepository } from '../src/stations/station.repository.js';
import { AuditLogService } from '../src/common/audit/audit-log.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('station name on hazardous readings', () => {
  it('findAll includes the related station name in the Prisma query', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const repo = new AirQualityRepository({ airQuality: { findMany } } as unknown as PrismaService);

    await repo.findAll({ city: 'Lagos' });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ include: { station: { select: { name: true } } } }),
    );
  });

  it('getHazardousReadings includes stationName on each result', async () => {
    const findAll = jest.fn().mockResolvedValue([
      { id: 'r1', stationId: 7, pm25: 18, pm10: null, co: null, no2: null, o3: null, so2: null, station: { name: 'Ijebu-Ode Roadside' } },
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

    const [result] = await service.getHazardousReadings('Lagos');

    expect(result.stationName).toBe('Ijebu-Ode Roadside');
  });
});
