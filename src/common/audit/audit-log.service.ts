import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Prisma } from '@prisma/client';

interface AuditLogEntry {
  userId: string;
  action: string;
  resource: string;
  resourceId: string;
  changes: Prisma.InputJsonValue;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.prisma.auditLog.create({ data: entry });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to write audit log entry for ${entry.resource} ${entry.resourceId}: ${msg}`);
    }
  }
}
