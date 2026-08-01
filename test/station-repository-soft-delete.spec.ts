// test/station-repository-soft-delete.spec.ts
import { StationRepository } from '../src/stations/station.repository.js';

describe('StationRepository soft delete', () => {
  it('delete() updates deletedAt instead of deleting the row, and does not touch AirQuality', async () => {
    const update = jest.fn().mockResolvedValue({ id: 1, deletedAt: new Date() });
    const deleteFn = jest.fn();
    const airQualityDeleteMany = jest.fn();
    const transaction = jest.fn();
    const prisma = {
      station: { update, delete: deleteFn },
      airQuality: { deleteMany: airQualityDeleteMany },
      $transaction: transaction,
    } as any;
    const repo = new StationRepository(prisma);

    await repo.delete(1);

    expect(update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { deletedAt: expect.any(Date) },
    });
    expect(deleteFn).not.toHaveBeenCalled();
    expect(airQualityDeleteMany).not.toHaveBeenCalled();
    expect(transaction).not.toHaveBeenCalled();
  });

  it('findAll excludes soft-deleted stations by default', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { station: { findMany } } as any;
    const repo = new StationRepository(prisma);

    await repo.findAll();

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ deletedAt: null }) }),
    );
  });

  it('findById excludes a soft-deleted station (returns null via the combined where)', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const prisma = { station: { findUnique } } as any;
    const repo = new StationRepository(prisma);

    await repo.findById(1);

    expect(findUnique).toHaveBeenCalledWith({ where: { id: 1, deletedAt: null } });
  });
});
