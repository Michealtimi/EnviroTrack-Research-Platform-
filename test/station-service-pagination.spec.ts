import { Test } from '@nestjs/testing';
import { StationService } from '../src/stations/station.service.js';
import { StationRepository } from '../src/stations/station.repository.js';

describe('StationService.getUnifiedStations pagination clamp', () => {
  it('clamps limit to 100 no matter what is requested', async () => {
    const findUnified = jest.fn().mockResolvedValue({ data: [], total: 0 });
    const module = await Test.createTestingModule({
      providers: [
        StationService,
        { provide: StationRepository, useValue: { findUnified } },
      ],
    }).compile();

    const service = module.get(StationService);
    await service.getUnifiedStations(undefined, undefined, undefined, 1, 999999);

    expect(findUnified).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ page: 1, limit: 100 }),
    );
  });
});
