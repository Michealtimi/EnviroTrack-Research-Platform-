# P1: Provenance, Soft Delete, Sync History, Exceedance Factors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give EnviroTrack the four things P0 explicitly deferred: an actually-used audit trail, non-destructive station deletion, visibility into whether the OpenAQ cron is healthy, and WHO exceedance factors instead of a bare hazardous/not-hazardous flag.

**Architecture:** No new subsystems. Hardens the existing `stations`, `air-quality`, and `openaq` modules in place, plus one new small provider (`AuditLogService`) following the same pattern as the existing `ApiKeyGuard` (a plain injectable added to each consuming module's `providers` array, no dedicated module).

**Tech Stack:** NestJS 11, Prisma 6 (client already generated against the current schema), class-validator/class-transformer, Jest — all already in place from P0. A real Postgres is reachable via `DATABASE_URL` in `.env` for this work (unlike P0's planning sandbox, migrations can be run for real with `prisma migrate dev`).

## Global Constraints

- Every task's audit/log write is **best-effort**: caught and logged, never thrown. A logging failure must never block the mutation or cron run it's describing.
- `AuditLog`'s `userId` field: literal string `"admin"` when the request carried a valid `x-api-key` matching `ADMIN_API_KEY`, `"public"` otherwise. There is no user-account system — do not build one.
- Audit logging covers: station update, station soft-delete, and **locally-submitted** (`source: 'local'`) reading creation only. OpenAQ-sourced station upserts and OpenAQ-synced readings are never individually audit-logged — they're covered in aggregate by `OpenAQSyncLog` (Task 3).
- Soft delete applies to `Station` only. `AirQuality` readings are never touched by a station's deletion — the existing cascade that hard-deletes a station's readings is removed, not replaced with a second soft-delete.
- A soft-deleted station returns 404 everywhere: `GET /stations/:id`, `findAll`, `findByCity`, `findUnified`. The row remains in Postgres.
- **Known, accepted limitation, not to be fixed in this plan:** the existing `@@unique([name, city])` constraint on `Station` (from P0) does not account for `deletedAt`. Creating a new station with the same name+city as a previously soft-deleted one will still fail with the existing "already exists" error. Fixing this would require a Postgres partial unique index, which Prisma's schema DSL cannot express directly — out of scope; note it in the README as a known limitation (Task 1, last step).
- WHO 2021 AQG values used (all in µg/m³, CO converted from its published 4 mg/m³): PM2.5=15, PM10=45 (already in code), NO2=25, SO2=40, O3=100, CO=4000.
- `co`/`no2`/`o3`/`so2` are, and always have been, µg/m³ in this codebase — only their Swagger descriptions incorrectly said "ppm". Task 4 corrects the descriptions; no unit conversion of stored data is needed or performed.

---

### Task 1: Soft delete — schema, repository, service

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/stations/station.repository.ts`
- Modify: `README.md`
- Test: `test/station-repository-soft-delete.spec.ts`

**Interfaces:**
- Produces: `StationRepository.delete(id)` no longer calls `prisma.station.delete` — it sets `deletedAt` via `prisma.station.update` and no longer touches `AirQuality` rows at all. `findAll`, `findByCity`, `findById`, `findFirst`, `findUnified` all exclude rows where `deletedAt` is not null. `StationService`/`StationController` need **no changes** — `delete()`'s signature and return type (`Promise<Station>`) are unchanged, only its internal behavior.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest station-repository-soft-delete`
Expected: FAIL — `delete()` still calls `$transaction`/`airQuality.deleteMany`/`station.delete`; `findAll`/`findById` don't filter `deletedAt`.

- [ ] **Step 3: Add `deletedAt` to the schema and migrate**

```prisma
// prisma/schema.prisma — Station model, add one field
model Station {
  id          Int          @id @default(autoincrement())
  name        String
  city        String
  country     String
  latitude    Float
  longitude   Float
  createdAt   DateTime     @default(now())
  deletedAt   DateTime?
  readings    AirQuality[]

  openaqStationId String?  @unique
  source      String       @default("local")
  externalId  String?      @unique

  @@unique([name, city])
}
```

Run: `npx prisma migrate dev --name station_soft_delete`
Expected: Prisma generates and applies a migration equivalent to `ALTER TABLE "public"."Station" ADD COLUMN "deletedAt" TIMESTAMP(3);` — a real DB is reachable via `.env`, so this runs for real (no hand-written SQL needed this time).

- [ ] **Step 4: Rewrite `StationRepository.delete` as a soft delete**

```ts
// src/stations/station.repository.ts — replace delete()
async delete(id: number): Promise<Station> {
  this.logger.log(`Soft-deleting station with ID: ${id}`);
  try {
    const result = await this.prisma.station.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    this.logger.log(`Station soft-deleted successfully: ${result.id}`);
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Failed to soft-delete station ID ${id}. Error: ${errorMessage}`);
    throw new InternalServerErrorException('Failed to delete station from the database.');
  }
}
```

(This replaces the entire old `delete()` body — the `$transaction`/`airQuality.deleteMany`/`station.delete` block is gone. No other method in the file changes shape yet — that's Step 5.)

- [ ] **Step 5: Filter `deletedAt: null` on every station-read method**

```ts
// src/stations/station.repository.ts — findAll, replace the where block
async findAll(filter?: { city?: string; country?: string }): Promise<Station[]> {
  this.logger.log('Fetching all stations...');
  try {
    const result = await this.prisma.station.findMany({
      where: {
        deletedAt: null,
        ...(filter?.city && { city: filter.city }),
        ...(filter?.country && { country: filter.country }),
      },
      orderBy: { createdAt: 'desc' },
    });
    this.logger.log(`Found ${result.length} stations.`);
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Failed to fetch all stations. Error: ${errorMessage}`);
    throw new InternalServerErrorException('Failed to retrieve stations from the database.');
  }
}

// findById — add deletedAt: null into the same where object (Prisma allows
// combining the unique field with extra non-unique filters on findUnique)
async findById(id: number): Promise<Station | null> {
  this.logger.log(`Fetching station by ID: ${id}`);
  try {
    const result = await this.prisma.station.findUnique({ where: { id, deletedAt: null } });
    if (result) {
      this.logger.log(`Found station with ID: ${id}`);
    } else {
      this.logger.warn(`No station found with ID: ${id}`);
    }
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Failed to fetch station by ID ${id}. Error: ${errorMessage}`);
    throw new InternalServerErrorException('Failed to retrieve station from the database.');
  }
}

// findByCity — add deletedAt: null
async findByCity(city: string): Promise<Station[]> {
  this.logger.log(`Fetching stations in city: ${city}`);
  try {
    const result = await this.prisma.station.findMany({ where: { city, deletedAt: null } });
    this.logger.log(`Found ${result.length} stations in ${city}.`);
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Failed to fetch stations by city ${city}. Error: ${errorMessage}`);
    throw new InternalServerErrorException('Failed to retrieve stations by city from the database.');
  }
}
```

```ts
// src/stations/station.repository.ts — findUnified, add deletedAt: null to the where builder
const where: Prisma.StationWhereInput = {
  deletedAt: null,
  ...(city && { city: { contains: city, mode: 'insensitive' } }),
  ...(country && { country }),
  ...(source && { source }),
};
```

Leave `findByNameAndCity` and `findFirst` untouched — `findByNameAndCity` is used by `createStation`'s duplicate check, and per the Global Constraints' documented limitation, a soft-deleted station's name+city should still be found as "taken" (that's the known, accepted limitation, not a bug to route around). `upsertFromOpenAQ` also stays untouched — OpenAQ stations are never soft-deleted through this API.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx jest station-repository-soft-delete`
Expected: all 3 pass.

- [ ] **Step 7: Run the full suite and build**

Run: `npm test && npm run build`
Expected: all suites pass, build exits 0. (`StationService.deleteStation` and `StationController.remove` need zero code changes — confirm this by reading them, not editing them.)

- [ ] **Step 8: Document the known limitation in the README**

Add under the existing "Protected routes" subsection in `README.md`:

```markdown
### 🗑️ Deletion is non-destructive

`DELETE /stations/:id` soft-deletes (sets `deletedAt`) rather than removing the row —
research data is never hard-deleted by this API. A soft-deleted station 404s on every
read route. Known limitation: creating a new station with the same name+city as a
previously deleted one will still fail as "already exists," since the uniqueness
check doesn't yet account for `deletedAt`.
```

- [ ] **Step 9: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/stations/station.repository.ts \
  README.md test/station-repository-soft-delete.spec.ts
git commit -m "feat: soft-delete stations instead of hard-deleting them and their readings"
```

---

### Task 2: Audit log — service, identity helper, and three call sites

**Files:**
- Create: `src/common/audit/audit-log.service.ts`
- Modify: `src/common/guards/api-key.guard.ts`
- Modify: `src/stations/station.module.ts`
- Modify: `src/stations/station.service.ts`
- Modify: `src/stations/station.controller.ts`
- Modify: `src/air-quality/air-quality.module.ts`
- Modify: `src/air-quality/air-quality.service.ts`
- Modify: `src/air-quality/air-quality.controller.ts`
- Test: `test/audit-log.service.spec.ts`, `test/api-key-identity.spec.ts`

**Interfaces:**
- Produces: `AuditLogService.log({ userId, action, resource, resourceId, changes }): Promise<void>` — swallows its own errors. `isAdminRequest(headers, configService): boolean` (exported from `api-key.guard.ts`, alongside `ApiKeyGuard`, which now uses it internally too). `StationService.updateStation(id, data, userId)` and `.deleteStation(id, userId)` take a new required `userId: string` parameter. `AirQualityService.createReading(stationId, data, source, userId?)` takes a new optional fourth parameter, only used when `source === 'local'`.

- [ ] **Step 1: Write the failing tests**

```ts
// test/audit-log.service.spec.ts
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
```

```ts
// test/api-key-identity.spec.ts
import { ConfigService } from '@nestjs/config';
import { isAdminRequest } from '../src/common/guards/api-key.guard.js';

describe('isAdminRequest', () => {
  it('returns true when the header matches ADMIN_API_KEY', () => {
    const configService = { get: () => 'secret' } as unknown as ConfigService;
    expect(isAdminRequest({ 'x-api-key': 'secret' }, configService)).toBe(true);
  });

  it('returns false when the header is missing or wrong', () => {
    const configService = { get: () => 'secret' } as unknown as ConfigService;
    expect(isAdminRequest({}, configService)).toBe(false);
    expect(isAdminRequest({ 'x-api-key': 'wrong' }, configService)).toBe(false);
  });

  it('returns false when ADMIN_API_KEY is not configured', () => {
    const configService = { get: () => undefined } as unknown as ConfigService;
    expect(isAdminRequest({ 'x-api-key': 'anything' }, configService)).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest audit-log.service api-key-identity`
Expected: FAIL — neither `AuditLogService` nor `isAdminRequest` exist yet.

- [ ] **Step 3: Implement `AuditLogService`**

```ts
// src/common/audit/audit-log.service.ts
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
```

- [ ] **Step 4: Extract `isAdminRequest` and reuse it in the guard**

```ts
// src/common/guards/api-key.guard.ts — full replacement
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export function isAdminRequest(headers: Record<string, unknown>, configService: ConfigService): boolean {
  const expectedKey = configService.get<string>('ADMIN_API_KEY');
  if (!expectedKey) return false;
  return headers['x-api-key'] === expectedKey;
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const expectedKey = this.configService.get<string>('ADMIN_API_KEY');

    if (!expectedKey) {
      throw new UnauthorizedException('Admin API key is not configured on the server.');
    }
    if (!isAdminRequest(request.headers, this.configService)) {
      throw new UnauthorizedException('Invalid or missing API key.');
    }
    return true;
  }
}
```

(The existing `test/api-key.guard.spec.ts` is untouched by this — same behavior, same public `ApiKeyGuard` class shape, just internally reusing the new helper.)

- [ ] **Step 5: Wire `AuditLogService` into `StationModule` and `StationService`**

```ts
// src/stations/station.module.ts — full replacement
import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { StationRepository } from './station.repository.js';
import { StationService } from './station.service.js';
import { StationController } from './station.controller.js';
import { ApiKeyGuard } from '../common/guards/api-key.guard.js';
import { AuditLogService } from '../common/audit/audit-log.service.js';

@Module({
  controllers: [StationController],
  providers: [PrismaService, StationRepository, StationService, ApiKeyGuard, AuditLogService],
  exports: [StationService],
})
export class StationModule {}
```

```ts
// src/stations/station.service.ts — constructor, updateStation, deleteStation
import {
  Injectable,
  NotFoundException,
  InternalServerErrorException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { StationRepository } from './station.repository.js';
import { CreateStationDto, UpdateStationDto } from './dto/create-station.dto.js';
import { AuditLogService } from '../common/audit/audit-log.service.js';

@Injectable()
export class StationService {
  private readonly logger = new Logger(StationService.name);

  constructor(
    private readonly stationRepo: StationRepository,
    private readonly auditLog: AuditLogService,
  ) {}

  // ... createStation, getAllStations, getStationById, getStationsByCity unchanged ...

  async updateStation(id: number, data: UpdateStationDto, userId: string) {
    this.logger.log(`Updating station ID: ${id}`);
    try {
      const station = await this.stationRepo.findById(id);
      if (!station) {
        this.logger.warn(`Update failed: Station with ID ${id} not found.`);
        throw new NotFoundException(`Station with ID ${id} not found`);
      }
      const updated = await this.stationRepo.update(id, data);
      await this.auditLog.log({
        userId,
        action: 'update',
        resource: 'Station',
        resourceId: String(id),
        changes: data,
      });
      this.logger.log(`Station updated successfully: ${updated.id}`);
      return updated;
    } catch (error: unknown) {
      if (error instanceof NotFoundException) throw error;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to update station ID ${id}. Error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to update station.');
    }
  }

  async deleteStation(id: number, userId: string) {
    this.logger.log(`Attempting to delete station ID: ${id}`);
    await this.getStationById(id);

    try {
      await this.stationRepo.delete(id);
      await this.auditLog.log({
        userId,
        action: 'soft_delete',
        resource: 'Station',
        resourceId: String(id),
        changes: { deletedAt: new Date().toISOString() },
      });
      this.logger.log(`Station deleted successfully: ${id}`);
      return { message: `Station ${id} deleted successfully` };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to delete station ID ${id}. Error: ${errorMessage}`);
      throw new InternalServerErrorException('An error occurred while deleting the station.');
    }
  }

  // ... upsertFromOpenAQ, findByExternalId, findByNameAndCity, getUnifiedStations unchanged ...
}
```

(Only the constructor, `updateStation`, and `deleteStation` change. Every other method in the file — `createStation`, `getAllStations`, `getStationById`, `getStationsByCity`, `upsertFromOpenAQ`, `findByExternalId`, `findByNameAndCity`, `getUnifiedStations` — is untouched.)

- [ ] **Step 6: Update `StationController` to derive identity and pass it through**

```ts
// src/stations/station.controller.ts — full replacement
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  Query,
  Req,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { StationService } from './station.service.js';
import { ApiTags, ApiOperation, ApiBody, ApiHeader } from '@nestjs/swagger';
import { CreateStationDto, UpdateStationDto } from './dto/create-station.dto.js';
import { UnifiedStationQueryDto } from './dto/unified-station-query.dto.js';
import { ApiKeyGuard, isAdminRequest } from '../common/guards/api-key.guard.js';

@ApiTags('stations')
@Controller('stations')
export class StationController {
  private readonly logger = new Logger(StationController.name);

  constructor(
    private readonly stationService: StationService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new station' })
  @ApiBody({ type: CreateStationDto })
  async create(@Body() body: CreateStationDto) {
    this.logger.log(`Request to create station with data: ${JSON.stringify(body)}`);
    return this.stationService.createStation(body);
  }

  @Get()
  @ApiOperation({ summary: 'Get all stations' })
  async findAll() {
    this.logger.log('Request to get all stations');
    return this.stationService.getAllStations();
  }

  @Get('city/:city')
  @ApiOperation({ summary: 'Get stations in a city' })
  async findByCity(@Param('city') city: string) {
    this.logger.log(`Request to get stations by city: ${city}`);
    return this.stationService.getStationsByCity(city);
  }

  @Get('unified')
  @ApiOperation({ summary: 'Get unified list of stations (local + OpenAQ)' })
  async getUnifiedStations(@Query() query: UnifiedStationQueryDto) {
    this.logger.log(`Request to get unified stations ${JSON.stringify(query)}`);
    return this.stationService.getUnifiedStations(
      query.city,
      query.country,
      query.source,
      query.page,
      query.limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get station by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Request to get station by ID: ${id}`);
    return this.stationService.getStationById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a station' })
  @ApiBody({ type: UpdateStationDto })
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: UpdateStationDto, @Req() req: Request) {
    this.logger.log(`Request to update station with ID: ${id}`);
    const userId = isAdminRequest(req.headers, this.configService) ? 'admin' : 'public';
    return this.stationService.updateStation(id, body, userId);
  }

  @Delete(':id')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({ name: 'x-api-key', required: true, description: 'Admin API key' })
  @ApiOperation({ summary: 'Delete a station (requires admin API key)' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Request to delete station with ID: ${id}`);
    // ApiKeyGuard already rejected this request if the key didn't match - always "admin" here.
    return this.stationService.deleteStation(id, 'admin');
  }
}
```

- [ ] **Step 7: Wire `AuditLogService` into `AirQualityModule` and `AirQualityService.createReading`**

```ts
// src/air-quality/air-quality.module.ts — full replacement
import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AirQualityRepository } from './air-quality.repository.js';
import { StationRepository } from '../stations/station.repository.js';
import { AirQualityController } from './air-quality.controller.js';
import { AirQualityService } from './air-quality.service.js';
import { AuditLogService } from '../common/audit/audit-log.service.js';

@Module({
  controllers: [AirQualityController],
  providers: [
    PrismaService,
    AirQualityRepository,
    StationRepository,
    AirQualityService,
    AuditLogService,
  ],
  exports: [AirQualityService],
})
export class AirQualityModule {}
```

```ts
// src/air-quality/air-quality.service.ts — constructor and createReading only
constructor(
  private readonly airQualityRepo: AirQualityRepository,
  private readonly stationRepo: StationRepository,
  private readonly auditLog: AuditLogService,
) {}

async createReading(
  stationId: number,
  data: {
    pm25: number | null;
    pm10: number | null;
    co: number | null;
    no2: number | null;
    o3: number | null;
    so2: number | null;
  },
  source: 'local' | 'openaq' = 'local',
  userId?: string,
) {
  try {
    const station = await this.stationRepo.findById(stationId);
    if (!station) throw new NotFoundException(`Station with ID ${stationId} not found`);

    const { pm25, pm10, co, no2, o3, so2 } = data;
    const createdReading = await this.airQualityRepo.create({
      stationId,
      pm25: pm25 ?? null,
      pm10: pm10 ?? null,
      co,
      no2,
      o3,
      so2,
      source,
    });

    if (source === 'local') {
      await this.auditLog.log({
        userId: userId ?? 'public',
        action: 'create',
        resource: 'AirQuality',
        resourceId: createdReading.id,
        changes: data,
      });
    }

    return plainToInstance(AirQualityReadingResponseDto, createdReading, { excludeExtraneousValues: true });
  } catch (error: unknown) {
    if (error instanceof NotFoundException) throw error;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Failed to create reading: ${msg}`);
    throw new InternalServerErrorException('Failed to create reading.');
  }
}
```

Add the import: `import { AuditLogService } from '../common/audit/audit-log.service.js';` at the top of `air-quality.service.ts`. Every other method in the file is untouched.

- [ ] **Step 8: Update `AirQualityController.create` to derive and pass identity**

```ts
// src/air-quality/air-quality.controller.ts — imports and create() only
import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  ParseIntPipe,
  Req,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiBody, ApiQuery } from '@nestjs/swagger';
import { CreateAirQualityDto } from './dto/create-reading.dto.js';
import { AirQualityService } from './air-quality.service.js';
import { isAdminRequest } from '../common/guards/api-key.guard.js';

@ApiTags('air-quality')
@Controller('air-quality')
export class AirQualityController {
  private readonly logger = new Logger(AirQualityController.name);

  constructor(
    private readonly airQualityService: AirQualityService,
    private readonly configService: ConfigService,
  ) {}

  @Post('station/:stationId')
  @ApiOperation({ summary: 'Create a new air quality reading for a station' })
  @ApiBody({ type: CreateAirQualityDto })
  async create(
    @Param('stationId', ParseIntPipe) stationId: number,
    @Body() body: CreateAirQualityDto,
    @Req() req: Request,
  ) {
    this.logger.log(`Request to create reading for station ID: ${stationId}`);
    const readingData = {
      pm25: body.pm25 ?? null,
      pm10: body.pm10 ?? null,
      co: body.co ?? null,
      no2: body.no2 ?? null,
      o3: body.o3 ?? null,
      so2: body.so2 ?? null,
    };
    const userId = isAdminRequest(req.headers, this.configService) ? 'admin' : 'public';
    return this.airQualityService.createReading(stationId, readingData, 'local', userId);
  }

  // ... findByStation, findByCity, averageByCity, hazardous, latestByStation unchanged ...
}
```

(Only imports, the constructor, and `create()` change. The `openaq-sync.service.ts` and `openaq.service.ts` call sites that invoke `createReading(..., 'openaq')` need **no changes** — they never pass a `userId`, `source` stays `'openaq'`, and the service skips the audit-log branch entirely for them.)

- [ ] **Step 9: Run tests to verify they pass**

Run: `npx jest audit-log.service api-key-identity api-key.guard`
Expected: all pass.

- [ ] **Step 10: Run the full suite and build**

Run: `npm test && npm run build`
Expected: all suites pass, build exits 0. If any existing test calls `updateStation`/`deleteStation`/`createReading` directly (check `test/station-service-pagination.spec.ts` and `test/air-quality-windowed.spec.ts` for this), update those call sites to pass the new required/optional argument — `station-service-pagination.spec.ts` only exercises `getUnifiedStations`, and `air-quality-windowed.spec.ts` only exercises `getAveragePollutionByCity`/`getHazardousReadings`, so neither should need changes; confirm this by running the suite rather than assuming.

- [ ] **Step 11: Commit**

```bash
git add src/common/audit/audit-log.service.ts src/common/guards/api-key.guard.ts \
  src/stations/station.module.ts src/stations/station.service.ts src/stations/station.controller.ts \
  src/air-quality/air-quality.module.ts src/air-quality/air-quality.service.ts src/air-quality/air-quality.controller.ts \
  test/audit-log.service.spec.ts test/api-key-identity.spec.ts
git commit -m "feat: write AuditLog entries for station updates/deletes and local readings"
```

---

### Task 3: OpenAQ sync history — writes + endpoint

**Files:**
- Modify: `src/openaq/openaq-sync.service.ts`
- Modify: `src/openaq/openaq.service.ts`
- Create: `src/openaq/dto/sync-history-query.dto.ts`
- Modify: `src/openaq/openaq.controller.ts`
- Modify: `README.md`
- Test: `test/openaq-sync-history.spec.ts`

**Interfaces:**
- Produces: `OpenAQSyncService` writes one `OpenAQSyncLog` row per phase (`resource: 'stations'` / `'measurements'`), on both success and failure. `OpenAQService.getSyncHistory(limit: number): Promise<OpenAQSyncLog[]>`. New public route `GET /openaq/sync-history?limit=`, clamped to 100, ordered `createdAt desc`.

- [ ] **Step 1: Write the failing tests**

```ts
// test/openaq-sync-history.spec.ts
import { Test } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { OpenAQSyncService } from '../src/openaq/openaq-sync.service.js';
import { OpenAQService } from '../src/openaq/openaq.service.js';
import { StationService } from '../src/stations/station.service.js';
import { AirQualityService } from '../src/air-quality/air-quality.service.js';

describe('OpenAQ sync history', () => {
  it('writes a success log row for the stations phase', async () => {
    const create = jest.fn().mockResolvedValue({});
    const httpGet = jest.fn().mockReturnValue(of({ data: { results: [] } }));
    const module = await Test.createTestingModule({
      providers: [
        OpenAQSyncService,
        { provide: StationService, useValue: { upsertFromOpenAQ: jest.fn(), getAllStations: jest.fn().mockResolvedValue([]) } },
        { provide: AirQualityService, useValue: { createReading: jest.fn() } },
        { provide: ConfigService, useValue: { get: () => undefined } },
        { provide: HttpService, useValue: { get: httpGet } },
        { provide: PrismaService, useValue: { openAQSyncLog: { create } } },
      ],
    }).compile();

    const service = module.get(OpenAQSyncService);
    await (service as any).syncStations();

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ resource: 'stations', status: 'success' }),
    });
  });

  it('writes a failed log row for the measurements phase when the HTTP call throws', async () => {
    const create = jest.fn().mockResolvedValue({});
    const httpGet = jest.fn().mockReturnValue(throwError(() => new Error('network down')));
    const module = await Test.createTestingModule({
      providers: [
        OpenAQSyncService,
        {
          provide: StationService,
          useValue: { getAllStations: jest.fn().mockResolvedValue([{ id: 1, source: 'openaq', externalId: '1', name: 'X' }]) },
        },
        { provide: AirQualityService, useValue: { createReading: jest.fn() } },
        { provide: ConfigService, useValue: { get: () => undefined } },
        { provide: HttpService, useValue: { get: httpGet } },
        { provide: PrismaService, useValue: { openAQSyncLog: { create } } },
      ],
    }).compile();

    const service = module.get(OpenAQSyncService);
    await (service as any).syncLatestMeasurements(new Map());

    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({ resource: 'measurements', status: 'success' }),
    });
    // Per-station HTTP failures are caught per-station (existing behavior) and don't fail
    // the phase itself, so the phase-level log is still "success" with a failed count > 0.
    const [[{ data }]] = create.mock.calls;
    expect(data.details.failed).toBe(1);
  });

  it('GET /openaq/sync-history returns the most recent entries, clamped to 100', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const module = await Test.createTestingModule({
      providers: [
        OpenAQService,
        { provide: StationService, useValue: {} },
        { provide: AirQualityService, useValue: {} },
        { provide: PrismaService, useValue: { openAQSyncLog: { findMany } } },
      ],
    }).compile();

    const service = module.get(OpenAQService);
    await service.getSyncHistory(999);

    expect(findMany).toHaveBeenCalledWith({
      take: 100,
      orderBy: { createdAt: 'desc' },
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest openaq-sync-history`
Expected: FAIL — `OpenAQSyncService` doesn't inject `PrismaService` or write log rows yet; `OpenAQService.getSyncHistory` doesn't exist.

- [ ] **Step 3: Write logs from `OpenAQSyncService`**

```ts
// src/openaq/openaq-sync.service.ts — full replacement
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { StationService } from '../stations/station.service.js';
import { AirQualityService } from '../air-quality/air-quality.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

interface OpenAQLocation {
  id: number;
  name: string;
  locality?: string | null;
  country?: { code?: string; name?: string } | null;
  coordinates?: { latitude?: number; longitude?: number } | null;
  sensors?: { id: number; parameter?: { name?: string } }[];
}

interface OpenAQLatestResult {
  sensorsId: number;
  value: number;
}

@Injectable()
export class OpenAQSyncService {
  private readonly logger = new Logger(OpenAQSyncService.name);
  private readonly baseUrl = 'https://api.openaq.org/v3';
  private readonly apiKey: string;
  private readonly pageLimit = 100;
  private readonly maxLocations: number;
  private readonly countryIso?: string;

  constructor(
    private readonly stationService: StationService,
    private readonly airQualityService: AirQualityService,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {
    this.apiKey = this.configService.get<string>('OPENAQ_API_KEY') ?? '';
    this.maxLocations = Number(this.configService.get<string>('OPENAQ_SYNC_MAX_LOCATIONS')) || 50;
    this.countryIso = this.configService.get<string>('OPENAQ_SYNC_COUNTRY_ISO') || undefined;
  }

  private async writeSyncLog(resource: 'stations' | 'measurements', status: 'success' | 'failed', details: Record<string, unknown>) {
    try {
      await this.prisma.openAQSyncLog.create({ data: { resource, status, details } });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to write OpenAQSyncLog entry for ${resource}: ${msg}`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async syncOpenAQ() {
    this.logger.log('🔄 Starting OpenAQ v3 sync...');
    try {
      const sensorParameterMap = await this.syncStations();
      await this.syncLatestMeasurements(sensorParameterMap);
      this.logger.log('✅ OpenAQ sync completed successfully.');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ OpenAQ sync failed. Error: ${errorMessage}`);
    }
  }

  // ponytail: v1 caps sync to `maxLocations` (optionally one country) to stay inside the
  // free-tier rate limit. Raise/drop the cap once on a paid key or full coverage is needed.
  private async syncStations(): Promise<Map<number, string>> {
    const start = Date.now();
    this.logger.log('📡 Syncing OpenAQ locations (v3)...');
    const sensorParameterMap = new Map<number, string>();
    let page = 1;
    let synced = 0;
    let failed = 0;

    try {
      while (synced < this.maxLocations) {
        const res = await firstValueFrom(
          this.httpService.get<{ results: OpenAQLocation[] }>(`${this.baseUrl}/locations`, {
            params: {
              limit: Math.min(this.pageLimit, this.maxLocations - synced),
              page,
              ...(this.countryIso && { iso: this.countryIso }),
            },
            headers: { 'X-API-Key': this.apiKey },
          }),
        );
        const locations = res.data?.results ?? [];
        if (locations.length === 0) break;

        for (const loc of locations) {
          if (synced >= this.maxLocations) break;
          try {
            await this.stationService.upsertFromOpenAQ({
              externalId: loc.id.toString(),
              name: loc.name,
              city: loc.locality ?? loc.country?.name ?? 'Unknown',
              country: loc.country?.name ?? loc.country?.code ?? 'Unknown',
              latitude: loc.coordinates?.latitude ?? 0,
              longitude: loc.coordinates?.longitude ?? 0,
            });
            for (const sensor of loc.sensors ?? []) {
              if (sensor.parameter?.name) sensorParameterMap.set(sensor.id, sensor.parameter.name);
            }
            synced++;
          } catch (err: unknown) {
            failed++;
            this.logger.error(`Failed to sync location ${loc.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
          }
        }

        page++;
      }

      this.logger.log(`✅ Synced ${synced} OpenAQ locations.`);
      await this.writeSyncLog('stations', 'success', { synced, failed, durationMs: Date.now() - start });
      return sensorParameterMap;
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await this.writeSyncLog('stations', 'failed', { synced, failed, durationMs: Date.now() - start, error: msg });
      throw error;
    }
  }

  private async syncLatestMeasurements(sensorParameterMap: Map<number, string>) {
    const start = Date.now();
    this.logger.log('📊 Syncing latest OpenAQ measurements (v3)...');
    let synced = 0;
    let failed = 0;

    try {
      const syncedStations = await this.stationService.getAllStations();
      const openaqStations = syncedStations.filter((s) => s.source === 'openaq' && s.externalId);

      for (const station of openaqStations) {
        try {
          const res = await firstValueFrom(
            this.httpService.get<{ results: OpenAQLatestResult[] }>(
              `${this.baseUrl}/locations/${station.externalId}/latest`,
              { headers: { 'X-API-Key': this.apiKey } },
            ),
          );
          const results = res.data?.results ?? [];
          if (results.length === 0) continue;

          const reading: Record<string, number | null> = {
            pm25: null, pm10: null, co: null, no2: null, o3: null, so2: null,
          };
          let matched = false;
          for (const r of results) {
            const paramName = sensorParameterMap.get(r.sensorsId);
            if (paramName && paramName in reading) {
              reading[paramName] = r.value;
              matched = true;
            }
          }
          if (!matched) {
            this.logger.warn(
              `No known pollutant matched for station ${station.name} (${station.externalId}) - ${results.length} sensor reading(s) returned but none mapped to a tracked parameter. Skipping empty reading.`,
            );
            continue;
          }
          await this.airQualityService.createReading(
            station.id,
            reading as { pm25: number | null; pm10: number | null; co: number | null; no2: number | null; o3: number | null; so2: number | null },
            'openaq',
          );
          synced++;
        } catch (err: unknown) {
          failed++;
          this.logger.error(`Failed to sync measurements for station ${station.name} (${station.externalId}): ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      this.logger.log('✅ Measurements sync process completed.');
      await this.writeSyncLog('measurements', 'success', { synced, failed, durationMs: Date.now() - start });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      await this.writeSyncLog('measurements', 'failed', { synced, failed, durationMs: Date.now() - start, error: msg });
      throw error;
    }
  }
}
```

(The only structural change is: `writeSyncLog` is new; `synced`/`failed` counters and a `start` timestamp are tracked in both phases; each phase's outer body is now wrapped in its own try/catch that logs before re-throwing, so `syncOpenAQ`'s existing catch-and-log-only behavior is unchanged. Per-item try/catch inside the loops — the existing error handling for individual stations/locations — is untouched.)

- [ ] **Step 4: Add `getSyncHistory` to `OpenAQService` and the query DTO**

```ts
// src/openaq/dto/sync-history-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class SyncHistoryQueryDto {
  @ApiPropertyOptional({ example: 50, default: 50, description: 'Clamped server-side to 100.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 50;
}
```

```ts
// src/openaq/openaq.service.ts — add this method to the existing class, no other changes
async getSyncHistory(limit: number) {
  const safeLimit = Math.min(limit, 100);
  this.logger.log(`Fetching OpenAQ sync history [limit=${safeLimit}]`);
  try {
    return await this.prisma.openAQSyncLog.findMany({
      take: safeLimit,
      orderBy: { createdAt: 'desc' },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Failed to fetch sync history: ${msg}`);
    throw error;
  }
}
```

- [ ] **Step 5: Add the public route**

```ts
// src/openaq/openaq.controller.ts — add this route; it must NOT carry @UseGuards
// (the class-level @UseGuards(ApiKeyGuard) only applies to routes without their own
// override, so this route needs @UseGuards() with no guard to opt out — see note below)
```

The class already has `@UseGuards(ApiKeyGuard)` at the controller level (from P0 Task 4), which applies to every route including new ones. Sync history is meant to be publicly readable operational visibility, not an admin action, so this route needs to opt out. NestJS applies guards controller-then-method, and a method-level `@UseGuards()` does not override a controller-level one — the only clean way to exempt one route is to move `@UseGuards(ApiKeyGuard)` from the class down onto the three POST routes individually.

```ts
// src/openaq/openaq.controller.ts — full replacement
import { Controller, Get, Post, Body, Query, Logger, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { ApiKeyGuard } from '../common/guards/api-key.guard.js';
import { OpenAQService } from './openaq.service.js';
import { OpenAQParameterDto } from './dto/openaq-parameter.dto.js';
import { OpenAQMeasurementDto } from './dto/openaq-measurement.dto.js';
import { SyncHistoryQueryDto } from './dto/sync-history-query.dto.js';

@ApiTags('OpenAQ')
@Controller('openaq')
export class OpenAQController {
  private readonly logger = new Logger(OpenAQController.name);

  constructor(private readonly openAQService: OpenAQService) {}

  @Post('parameters/sync')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({ name: 'x-api-key', required: true, description: 'Admin API key' })
  @ApiOperation({ summary: 'Sync OpenAQ parameters (requires admin API key)' })
  @ApiResponse({ status: 201, description: 'Parameters synced successfully.' })
  async syncParameters(@Body() params: OpenAQParameterDto[]) {
    this.logger.log(`Received request to sync ${params.length} parameters.`);
    return this.openAQService.syncParameters(params);
  }

  @Post('measurements/sync')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({ name: 'x-api-key', required: true, description: 'Admin API key' })
  @ApiOperation({ summary: 'Sync OpenAQ measurements (requires admin API key)' })
  @ApiResponse({ status: 201, description: 'Measurements synced successfully.' })
  async syncMeasurements(@Body() measurements: OpenAQMeasurementDto[]) {
    this.logger.log(`Received request to sync ${measurements.length} measurements.`);
    return this.openAQService.syncMeasurements(measurements);
  }

  @Post('full-sync')
  @UseGuards(ApiKeyGuard)
  @ApiHeader({ name: 'x-api-key', required: true, description: 'Admin API key' })
  @ApiOperation({ summary: 'Full sync: parameters + measurements (requires admin API key)' })
  @ApiResponse({ status: 201, description: 'Full OpenAQ sync completed.' })
  async fullSync(
    @Body() data: { parameters: OpenAQParameterDto[]; measurements: OpenAQMeasurementDto[] },
  ) {
    this.logger.log(`Received request for full OpenAQ sync.`);
    return this.openAQService.fullOpenAQSync(data);
  }

  @Get('sync-history')
  @ApiOperation({ summary: 'Get recent OpenAQ sync run history (public, read-only)' })
  async syncHistory(@Query() query: SyncHistoryQueryDto) {
    this.logger.log(`Request for OpenAQ sync history [limit=${query.limit}]`);
    return this.openAQService.getSyncHistory(query.limit);
  }
}
```

This is a **spec deviation worth flagging in the commit message**: the original design said "no new endpoint auth changes," but achieving "sync-history is public while the three sync-trigger routes stay admin-only" mechanically requires moving the guard from class-level to per-route — the three existing routes keep the exact same protection, just declared in three places instead of one.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx jest openaq-sync-history`
Expected: all 3 pass.

- [ ] **Step 7: Run the full suite and build**

Run: `npm test && npm run build`
Expected: all pass, including the existing `test/openaq-sync-v3.spec.ts` (its providers list doesn't include `PrismaService` — check whether it needs one added now that `OpenAQSyncService`'s constructor takes a 5th parameter; if its tests fail with a missing-provider error, add `{ provide: PrismaService, useValue: { openAQSyncLog: { create: jest.fn() } } }` to that test file's provider list).

- [ ] **Step 8: Document the endpoint in the README**

Add under "API Usage" in `README.md`:

```markdown
### 🩺 Sync health

`GET /openaq/sync-history?limit=` (public, clamped to 100) returns the most recent OpenAQ
sync log entries — one per phase (`stations`/`measurements`) per hourly run, each with a
`success`/`failed` status and a `details` object (`synced`, `failed`, `durationMs`). This is
how you tell whether the cron is silently failing instead of finding out from stale data.
```

- [ ] **Step 9: Commit**

```bash
git add src/openaq/openaq-sync.service.ts src/openaq/openaq.service.ts src/openaq/openaq.controller.ts \
  src/openaq/dto/sync-history-query.dto.ts README.md test/openaq-sync-history.spec.ts \
  test/openaq-sync-v3.spec.ts
git commit -m "feat: write OpenAQSyncLog entries per sync phase, add public GET /openaq/sync-history"
```

---

### Task 4: Exceedance factors on the hazardous endpoint

**Files:**
- Modify: `src/air-quality/air-quality.service.ts`
- Modify: `src/air-quality/dto/air-quality-response.dto.ts`
- Modify: `src/air-quality/dto/create-reading.dto.ts`
- Test: `test/air-quality-exceedance.spec.ts`

**Interfaces:**
- Produces: `AirQualityService.getHazardousReadings(city, hours)` now returns `Array<AirQualityReadingResponseDto & { exceedances: { pollutant: string; value: number; limit: number; factor: number }[] }>`. A reading is included only if `exceedances.length > 0`.

- [ ] **Step 1: Write the failing test**

```ts
// test/air-quality-exceedance.spec.ts
import { Test } from '@nestjs/testing';
import { AirQualityService } from '../src/air-quality/air-quality.service.js';
import { AirQualityRepository } from '../src/air-quality/air-quality.repository.js';
import { StationRepository } from '../src/stations/station.repository.js';
import { AuditLogService } from '../src/common/audit/audit-log.service.js';

describe('AirQualityService exceedance factors', () => {
  const buildService = async (findAllResult: any[]) => {
    const findAll = jest.fn().mockResolvedValue(findAllResult);
    const module = await Test.createTestingModule({
      providers: [
        AirQualityService,
        { provide: AirQualityRepository, useValue: { findAll } },
        { provide: StationRepository, useValue: {} },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();
    return module.get(AirQualityService);
  };

  it('computes exceedance factors for every pollutant over its WHO limit', async () => {
    const service = await buildService([
      { id: 'r1', pm25: 18, pm10: null, co: null, no2: 325, o3: null, so2: null },
    ]);

    const [result] = await service.getHazardousReadings('Lagos');

    expect(result.exceedances).toEqual(
      expect.arrayContaining([
        { pollutant: 'pm25', value: 18, limit: 15, factor: 1.2 },
        { pollutant: 'no2', value: 325, limit: 25, factor: 13 },
      ]),
    );
    expect(result.exceedances.length).toBe(2);
  });

  it('excludes a reading where every pollutant is within its limit', async () => {
    const service = await buildService([
      { id: 'r2', pm25: 10, pm10: 20, co: 100, no2: 5, o3: 10, so2: 2 },
    ]);

    const result = await service.getHazardousReadings('Lagos');

    expect(result.length).toBe(0);
  });

  it('skips null pollutant values without crashing', async () => {
    const service = await buildService([
      { id: 'r3', pm25: null, pm10: null, co: null, no2: null, o3: null, so2: null },
    ]);

    const result = await service.getHazardousReadings('Lagos');

    expect(result.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest air-quality-exceedance`
Expected: FAIL — `getHazardousReadings` doesn't return an `exceedances` field yet, and still uses the old `pm25 > 25 || pm10 > 50` check.

- [ ] **Step 3: Rewrite `getHazardousReadings` with WHO limits for all six pollutants**

```ts
// src/air-quality/air-quality.service.ts — add this map near the other static fields,
// and replace getHazardousReadings entirely
private static readonly WHO_LIMITS_UGM3: Record<string, number> = {
  pm25: 15,
  pm10: 45,
  no2: 25,
  so2: 40,
  o3: 100,
  co: 4000,
};

async getHazardousReadings(city: string, hours = 24) {
  const safeHours = Math.min(hours, AirQualityService.MAX_WINDOW_HOURS);
  const since = new Date(Date.now() - safeHours * 60 * 60 * 1000);
  try {
    const readings = await this.airQualityRepo.findAll({ city, since });
    const withExceedances = readings.map((r: AirQuality) => {
      const exceedances: { pollutant: string; value: number; limit: number; factor: number }[] = [];
      for (const [pollutant, limit] of Object.entries(AirQualityService.WHO_LIMITS_UGM3)) {
        const value = (r as unknown as Record<string, number | null>)[pollutant];
        if (value !== null && value !== undefined && value > limit) {
          exceedances.push({ pollutant, value, limit, factor: Math.round((value / limit) * 10) / 10 });
        }
      }
      return { reading: r, exceedances };
    });
    const hazardous = withExceedances.filter((x) => x.exceedances.length > 0);
    return hazardous.map((x) => ({
      ...plainToInstance(AirQualityReadingResponseDto, x.reading, { excludeExtraneousValues: true }),
      exceedances: x.exceedances,
    }));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Failed to fetch hazardous readings for city ${city}: ${msg}`);
    throw new InternalServerErrorException('Failed to fetch hazardous readings.');
  }
}
```

`WHO_24H_PM25_UGM3`/`WHO_24H_PM10_UGM3` (the two static fields from P0 Task 5) are now superseded by `WHO_LIMITS_UGM3` — remove the two old fields; nothing else references them (`getAveragePollutionByCity` never used them).

- [ ] **Step 4: Correct the µg/m³ documentation on both DTOs**

```ts
// src/air-quality/dto/create-reading.dto.ts — update only the @ApiProperty descriptions,
// no other change (fields are already all optional/bounded number from P0 Task 1)
@ApiProperty({ description: 'Carbon monoxide µg/m³', example: 1200, required: false })
// ...
co?: number;

@ApiProperty({ description: 'Nitrogen dioxide µg/m³', example: 18, required: false })
// ...
no2?: number;

@ApiProperty({ description: 'Ozone µg/m³', example: 40, required: false })
// ...
o3?: number;

@ApiProperty({ description: 'Sulfur dioxide µg/m³', example: 12, required: false })
// ...
so2?: number;
```

```ts
// src/air-quality/dto/air-quality-response.dto.ts — same description-only correction
@ApiProperty({ description: 'Carbon monoxide µg/m³', example: 1200, nullable: true })
// ...
@ApiProperty({ description: 'Nitrogen dioxide µg/m³', example: 18, nullable: true })
// ...
@ApiProperty({ description: 'Ozone µg/m³', example: 40, nullable: true })
// ...
@ApiProperty({ description: 'Sulfur dioxide µg/m³', example: 12, nullable: true })
```

Only the `description`/`example` values change — field names, types, decorators, and `pm25`/`pm10` descriptions (already correct) stay exactly as they are.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest air-quality-exceedance air-quality-windowed`
Expected: all pass — `air-quality-windowed.spec.ts`'s existing hazardous test (`pm25 > 15` at the old boundary) still passes since PM2.5's limit is unchanged; it's testing the same threshold through the new code path.

- [ ] **Step 6: Run the full suite and build**

Run: `npm test && npm run build`
Expected: all pass.

- [ ] **Step 7: Document the exceedance factor in the README**

Replace the existing "⚠️ Hazardous reading thresholds" subsection in `README.md`:

```markdown
### ⚠️ Hazardous reading thresholds & exceedance factors

`GET /air-quality/city/:city/hazardous` flags a reading as hazardous when any of its six
pollutants exceeds its WHO 2021 Air Quality Guideline value over the requested window
(default 24h): PM2.5 > 15 µg/m³, PM10 > 45 µg/m³, NO2 > 25 µg/m³, SO2 > 40 µg/m³,
O3 > 100 µg/m³, CO > 4000 µg/m³. Each hazardous reading's response includes an
`exceedances` array — e.g. `{"pollutant": "no2", "value": 325, "limit": 25, "factor": 13}` —
so a policy analyst can read "NO2 at this station is 13x the WHO limit" directly off the API.
```

- [ ] **Step 8: Commit**

```bash
git add src/air-quality/air-quality.service.ts src/air-quality/dto/air-quality-response.dto.ts \
  src/air-quality/dto/create-reading.dto.ts README.md test/air-quality-exceedance.spec.ts
git commit -m "feat: compute WHO exceedance factors for all six pollutants on the hazardous endpoint"
```

---

## Post-plan acceptance check (run once all tasks are done)

- [ ] `DELETE /stations/:id` with a valid key → 200, then `GET /stations/:id` → 404
- [ ] `PATCH /stations/:id` (no key) → succeeds, and a row appears in `AuditLog` with `userId: "public"`
- [ ] `PATCH /stations/:id` (with a valid `x-api-key`) → a row appears with `userId: "admin"`
- [ ] `POST /air-quality/station/:id` (local reading) → a row appears in `AuditLog` with `action: "create"`
- [ ] Trigger a sync (real key/DB) → two new `OpenAQSyncLog` rows appear (`stations`, `measurements`), and `GET /openaq/sync-history` returns them, most recent first
- [ ] `GET /air-quality/city/:city/hazardous` on a reading with `no2` well over 25 → response includes an `exceedances` entry with the correct `factor`
- [ ] `npm run build` and `npm test` both pass
- [ ] Swagger at `/docs` shows µg/m³ for all six pollutants, not ppm
