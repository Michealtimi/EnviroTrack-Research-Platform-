import { BadRequestException } from '@nestjs/common';
import { StationRepository } from '../src/stations/station.repository.js';
import { Prisma } from '@prisma/client';

describe('StationRepository.create', () => {
  it('converts a Prisma unique-constraint error into a BadRequestException', async () => {
    const prismaError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '6.16.2',
    });
    const prisma = { station: { create: jest.fn().mockRejectedValue(prismaError) } } as any;
    const repo = new StationRepository(prisma);

    await expect(
      repo.create({ name: 'Dup', city: 'X', country: 'Y', latitude: 0, longitude: 0, source: 'local', externalId: null, openaqStationId: null }),
    ).rejects.toThrow(BadRequestException);
  });
});
