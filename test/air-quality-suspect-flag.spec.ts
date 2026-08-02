import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AirQualityService } from '../src/air-quality/air-quality.service.js';
import { AirQualityRepository } from '../src/air-quality/air-quality.repository.js';
import { StationRepository } from '../src/stations/station.repository.js';
import { AuditLogService } from '../src/common/audit/audit-log.service.js';

describe('AirQualityService.setSuspectFlag', () => {
  const buildService = async (findByIdResult: any) => {
    const findById = jest.fn().mockResolvedValue(findByIdResult);
    const update = jest.fn().mockResolvedValue({ id: 'r1', isSuspect: true, suspectReason: 'Sensor drift suspected' });
    const log = jest.fn();
    const module = await Test.createTestingModule({
      providers: [
        AirQualityService,
        { provide: AirQualityRepository, useValue: { findById, update } },
        { provide: StationRepository, useValue: {} },
        { provide: AuditLogService, useValue: { log } },
      ],
    }).compile();
    return { service: module.get(AirQualityService), update, log };
  };

  it('updates the reading and writes an audit log entry', async () => {
    const { service, update, log } = await buildService({ id: 'r1' });

    await service.setSuspectFlag('r1', true, 'Sensor drift suspected', 'admin');

    expect(update).toHaveBeenCalledWith('r1', { isSuspect: true, suspectReason: 'Sensor drift suspected' });
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'admin', action: 'flag_suspect', resource: 'AirQuality', resourceId: 'r1' }),
    );
  });

  it('throws NotFoundException for a nonexistent reading', async () => {
    const { service } = await buildService(null);

    await expect(service.setSuspectFlag('missing', true, null, 'admin')).rejects.toThrow(NotFoundException);
  });
});
