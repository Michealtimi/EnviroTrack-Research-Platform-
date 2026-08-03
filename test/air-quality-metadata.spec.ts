import { Test } from '@nestjs/testing';
import { AirQualityService } from '../src/air-quality/air-quality.service.js';
import { AirQualityRepository } from '../src/air-quality/air-quality.repository.js';
import { StationRepository } from '../src/stations/station.repository.js';
import { AuditLogService } from '../src/common/audit/audit-log.service.js';

describe('AirQualityService.createReading metadata fields', () => {
  it('passes instrument/calibration/sampling/weather/temp/humidity through to the repository, and always sets isSuspect false / suspectReason null', async () => {
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

    const service = module.get(AirQualityService);
    await service.createReading(1, {
      pm25: 10, pm10: null, co: null, no2: null, o3: null, so2: null,
      instrumentModel: 'Aeroqual Series 500',
      calibrationDate: new Date('2026-06-01T00:00:00.000Z'),
      samplingDurationMinutes: 15,
      weatherConditions: 'Sunny, light wind, 28°C',
      temperature: 28.4,
      humidity: 61,
    }, 'local', 'public');

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        instrumentModel: 'Aeroqual Series 500',
        calibrationDate: new Date('2026-06-01T00:00:00.000Z'),
        samplingDurationMinutes: 15,
        weatherConditions: 'Sunny, light wind, 28°C',
        temperature: 28.4,
        humidity: 61,
        isSuspect: false,
        suspectReason: null,
      }),
    );
  });

  it('defaults every metadata field to null when omitted', async () => {
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

    const service = module.get(AirQualityService);
    await service.createReading(1, {
      pm25: 10, pm10: null, co: null, no2: null, o3: null, so2: null,
    } as any, 'local', 'public');

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        instrumentModel: null,
        calibrationDate: null,
        samplingDurationMinutes: null,
        weatherConditions: null,
        temperature: null,
        humidity: null,
      }),
    );
  });
});
