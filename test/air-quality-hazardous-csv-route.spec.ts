import { Test } from '@nestjs/testing';
import { AirQualityController } from '../src/air-quality/air-quality.controller.js';
import { AirQualityService } from '../src/air-quality/air-quality.service.js';
import { ConfigService } from '@nestjs/config';

describe('GET /air-quality/city/:city/hazardous?format=csv', () => {
  const buildController = async (hazardousResult: any[]) => {
    const getHazardousReadings = jest.fn().mockResolvedValue(hazardousResult);
    const module = await Test.createTestingModule({
      controllers: [AirQualityController],
      providers: [
        { provide: AirQualityService, useValue: { getHazardousReadings } },
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    }).compile();
    return module.get(AirQualityController);
  };

  const mockResponse = () => {
    const res: any = {};
    res.setHeader = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
  };

  it('returns CSV with the correct headers when format=csv', async () => {
    const controller = await buildController([
      {
        id: 'r1', stationId: 7, stationName: 'Ijebu-Ode Roadside',
        measuredAt: new Date('2026-07-15T09:00:00.000Z'), createdAt: new Date('2026-07-15T09:00:00.000Z'),
        isSuspect: false,
        exceedances: [{ pollutant: 'no2', value: 325, limit: 25, factor: 13 }],
      },
    ]);
    const res = mockResponse();

    await controller.hazardous('Lagos', undefined, 'csv', res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('attachment'));
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('no2,325,25,13'));
  });

  it('returns the existing JSON shape when format is absent', async () => {
    const jsonResult = [{ id: 'r1', exceedances: [] }];
    const controller = await buildController(jsonResult);
    const res = mockResponse();

    const result = await controller.hazardous('Lagos', undefined, undefined, res);

    expect(result).toBe(jsonResult);
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it('returns the existing JSON shape when format is an unrecognized value', async () => {
    const jsonResult = [{ id: 'r1', exceedances: [] }];
    const controller = await buildController(jsonResult);
    const res = mockResponse();

    const result = await controller.hazardous('Lagos', undefined, 'xml', res);

    expect(result).toBe(jsonResult);
    expect(res.setHeader).not.toHaveBeenCalled();
  });
});
