import { AuditLogService } from '../src/common/audit/audit-log.service.js';

describe('AuditLogService', () => {
  it('writes an audit log entry with the given fields', async () => {
    const create = jest.fn().mockResolvedValue({});
    const prisma = { auditLog: { create } } as any;
    const service = new AuditLogService(prisma);

    await service.log({
      userId: 'admin',
      action: 'update',
      resource: 'Station',
      resourceId: '1',
      changes: { name: 'New Name' },
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        userId: 'admin',
        action: 'update',
        resource: 'Station',
        resourceId: '1',
        changes: { name: 'New Name' },
      },
    });
  });

  it('swallows a write failure instead of throwing', async () => {
    const create = jest.fn().mockRejectedValue(new Error('db down'));
    const prisma = { auditLog: { create } } as any;
    const service = new AuditLogService(prisma);

    await expect(
      service.log({ userId: 'public', action: 'create', resource: 'AirQuality', resourceId: 'abc', changes: {} }),
    ).resolves.toBeUndefined();
  });
});
