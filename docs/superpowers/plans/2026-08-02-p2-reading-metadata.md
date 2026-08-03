# P2: Reading Metadata, Suspect-Flag, Duplicate Detection, Completeness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give researchers somewhere to put instrument/calibration/weather metadata, give stewards a non-destructive way to flag bad readings, and add duplicate-detection and completeness visibility — the four items identified for the field-researcher and data-steward personas that P0/P1 didn't cover.

**Architecture:** Extends the existing `air-quality` and `stations` modules in place — one schema migration, one new DTO, one new repository method, three new endpoints. No new modules.

**Tech Stack:** NestJS 11, Prisma 6, class-validator/class-transformer, Jest — unchanged from P0/P1. A real Postgres is reachable via `.env` for real migrations.

## Global Constraints

- All eight new `AirQuality` fields (six metadata + `isSuspect` + `suspectReason`) are added to `CreateAirQualityDto`... except `isSuspect`/`suspectReason`, which are **never** part of the create DTO — only settable via the dedicated `PATCH /air-quality/:id/suspect` route. A submitter can never self-report their own reading as suspect.
- `PATCH /air-quality/:id/suspect` is admin-gated (`ApiKeyGuard`), same reasoning as `DELETE /stations/:id` in P0 — a mutation with judgment consequences, not a public write. It writes an `AuditLogService` entry (`action: 'flag_suspect'`), reusing the exact pattern `StationService.deleteStation` already established.
- Duplicate detection (`GET /air-quality/city/:city/duplicates`) and completeness (`GET /stations/:id/completeness`) are both public reads — pure aggregation, no writes, no side effects. Neither auto-flags or auto-corrects anything.
- Duplicate definition: readings on the same `stationId` with **identical values across all six pollutants** (including matching nulls) whose `createdAt` values span **60 seconds or less**.
- Completeness applies **only** to `source: 'openaq'` stations. A local station returns `{ applicable: false }`, never a fabricated percentage.
- Follow the existing repository/service/controller three-layer pattern exactly — same `Logger`, try/catch, and error-message conventions already used throughout `station.repository.ts`/`air-quality.repository.ts`.

---

### Task 1: Reading metadata fields — schema, DTOs, create/response path

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/air-quality/dto/create-reading.dto.ts`
- Modify: `src/air-quality/dto/air-quality-response.dto.ts`
- Modify: `src/air-quality/air-quality.service.ts`
- Modify: `src/air-quality/air-quality.controller.ts`
- Test: `test/air-quality-metadata.spec.ts`

**Interfaces:**
- Produces: `AirQuality` gains `instrumentModel String?`, `calibrationDate DateTime?`, `samplingDurationMinutes Int?`, `weatherConditions String?`, `temperature Float?`, `humidity Float?`, `isSuspect Boolean @default(false)`, `suspectReason String?`. `AirQualityService.createReading`'s `data` parameter gains the six metadata fields (all `| null`), unchanged otherwise. `isSuspect`/`suspectReason` are always written as `false`/`null` at creation time regardless of input (there is no input for them).

- [ ] **Step 1: Write the failing test**

```ts
// test/air-quality-metadata.spec.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest air-quality-metadata`
Expected: FAIL — `createReading`'s `data` type has no metadata fields yet, and `AirQualityRepository.create` is called without them.

- [ ] **Step 3: Add the fields to the schema and migrate**

```prisma
// prisma/schema.prisma — AirQuality model, replace entirely
model AirQuality {
  id        String   @id @default(uuid())
  stationId Int
  createdAt DateTime @default(now())
  co        Float?
  no2       Float?
  o3        Float?
  so2       Float?
  pm10      Float?
  pm25      Float?
  station   Station  @relation(fields: [stationId], references: [id])
  source    String   @default("local") // "local" | "openaq"

  instrumentModel         String?
  calibrationDate         DateTime?
  samplingDurationMinutes Int?
  weatherConditions       String?
  temperature             Float?
  humidity                Float?

  isSuspect     Boolean @default(false)
  suspectReason String?
}
```

Run: `npx prisma migrate dev --name air_quality_metadata_suspect_flag`
Expected: Prisma generates and applies a migration adding all eight columns (nullable, `isSuspect` with a `false` default) against the real DB reachable via `.env`.

- [ ] **Step 4: Add the six fields to `CreateAirQualityDto`**

```ts
// src/air-quality/dto/create-reading.dto.ts — add these six fields to the existing class,
// after the so2 field. No other field changes.
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
// ... (add IsDateString, IsInt, IsString, MaxLength to the existing class-validator import line)

  @ApiProperty({ description: 'Instrument model used to take this reading', example: 'Aeroqual Series 500', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  instrumentModel?: string;

  @ApiProperty({ description: 'Date the instrument was last calibrated (ISO 8601)', example: '2026-06-01', required: false })
  @IsOptional()
  @IsDateString()
  calibrationDate?: string;

  @ApiProperty({ description: 'How long the sample was taken over, in minutes', example: 15, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  samplingDurationMinutes?: number;

  @ApiProperty({ description: 'Free-text weather conditions at the time of the reading', example: 'Sunny, light wind, 28°C', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  weatherConditions?: string;

  @ApiProperty({ description: 'Ambient temperature, °C', example: 28.4, required: false })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(60)
  temperature?: number;

  @ApiProperty({ description: 'Relative humidity, %', example: 61, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  humidity?: number;
```

- [ ] **Step 5: Add all eight fields to `AirQualityReadingResponseDto`**

```ts
// src/air-quality/dto/air-quality-response.dto.ts — add to AirQualityReadingResponseDto,
// after the so2 field and before createdAt. Import Expose is already there.
  @ApiProperty({ description: 'Instrument model used to take this reading', example: 'Aeroqual Series 500', nullable: true })
  @Expose()
  instrumentModel: string | null;

  @ApiProperty({ description: 'Date the instrument was last calibrated', example: '2026-06-01T00:00:00.000Z', nullable: true })
  @Expose()
  calibrationDate: Date | null;

  @ApiProperty({ description: 'Sampling duration, minutes', example: 15, nullable: true })
  @Expose()
  samplingDurationMinutes: number | null;

  @ApiProperty({ description: 'Weather conditions at the time of the reading', example: 'Sunny, light wind, 28°C', nullable: true })
  @Expose()
  weatherConditions: string | null;

  @ApiProperty({ description: 'Ambient temperature, °C', example: 28.4, nullable: true })
  @Expose()
  temperature: number | null;

  @ApiProperty({ description: 'Relative humidity, %', example: 61, nullable: true })
  @Expose()
  humidity: number | null;

  @ApiProperty({ description: 'Whether a steward has flagged this reading as suspect', example: false })
  @Expose()
  isSuspect: boolean;

  @ApiProperty({ description: 'Steward-provided reason the reading is flagged suspect', example: null, nullable: true })
  @Expose()
  suspectReason: string | null;
```

- [ ] **Step 6: Update `AirQualityService.createReading`'s signature and body**

```ts
// src/air-quality/air-quality.service.ts — replace createReading entirely
async createReading(
  stationId: number,
  data: {
    pm25: number | null;
    pm10: number | null;
    co: number | null;
    no2: number | null;
    o3: number | null;
    so2: number | null;
    instrumentModel?: string | null;
    calibrationDate?: Date | null;
    samplingDurationMinutes?: number | null;
    weatherConditions?: string | null;
    temperature?: number | null;
    humidity?: number | null;
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
      instrumentModel: data.instrumentModel ?? null,
      calibrationDate: data.calibrationDate ?? null,
      samplingDurationMinutes: data.samplingDurationMinutes ?? null,
      weatherConditions: data.weatherConditions ?? null,
      temperature: data.temperature ?? null,
      humidity: data.humidity ?? null,
      isSuspect: false,
      suspectReason: null,
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

- [ ] **Step 7: Pass the six fields through the controller**

```ts
// src/air-quality/air-quality.controller.ts — replace the create() method body
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
    instrumentModel: body.instrumentModel ?? null,
    calibrationDate: body.calibrationDate ? new Date(body.calibrationDate) : null,
    samplingDurationMinutes: body.samplingDurationMinutes ?? null,
    weatherConditions: body.weatherConditions ?? null,
    temperature: body.temperature ?? null,
    humidity: body.humidity ?? null,
  };
  const userId = isAdminRequest(req.headers, this.configService) ? 'admin' : 'public';
  return this.airQualityService.createReading(stationId, readingData, 'local', userId);
}
```

(`calibrationDate` is converted from the DTO's validated ISO string to a real `Date` here — explicit conversion rather than relying on Prisma's implicit string coercion.)

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx jest air-quality-metadata`
Expected: both pass.

- [ ] **Step 9: Run the full suite and build**

Run: `npm test && npm run build`
Expected: all pass, build exits 0.

- [ ] **Step 10: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/air-quality/dto/create-reading.dto.ts \
  src/air-quality/dto/air-quality-response.dto.ts src/air-quality/air-quality.service.ts \
  src/air-quality/air-quality.controller.ts test/air-quality-metadata.spec.ts
git commit -m "feat: add instrument/calibration/sampling/weather/temp/humidity metadata to readings"
```

---

### Task 2: Suspect-flag endpoint

**Files:**
- Modify: `src/air-quality/air-quality.repository.ts`
- Create: `src/air-quality/dto/set-suspect.dto.ts`
- Modify: `src/air-quality/air-quality.service.ts`
- Modify: `src/air-quality/air-quality.controller.ts`
- Test: `test/air-quality-suspect-flag.spec.ts`

**Interfaces:**
- Consumes: `AirQualityReadingResponseDto` (Task 1, already exposes `isSuspect`/`suspectReason`).
- Produces: `AirQualityRepository.update(id, data): Promise<AirQuality>`. `AirQualityService.setSuspectFlag(id, isSuspect, suspectReason, userId): Promise<AirQualityReadingResponseDto>` — throws `NotFoundException` if the reading doesn't exist. `PATCH /air-quality/:id/suspect`, admin-gated.

- [ ] **Step 1: Write the failing test**

```ts
// test/air-quality-suspect-flag.spec.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest air-quality-suspect-flag`
Expected: FAIL — `setSuspectFlag` doesn't exist.

- [ ] **Step 3: Add `update` to `AirQualityRepository`**

```ts
// src/air-quality/air-quality.repository.ts — add this method, in the BASIC CRUD section
// after delete()
/** Update a reading (used for the suspect-flag endpoint) */
async update(id: string, data: Partial<AirQuality>): Promise<AirQuality> {
  this.logger.log(`Updating reading with ID: ${id}`);
  try {
    const result = await this.prisma.airQuality.update({ where: { id }, data });
    this.logger.log(`Successfully updated reading with ID: ${id}`);
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Failed to update reading with ID ${id}. Error: ${errorMessage}`);
    throw new InternalServerErrorException('Failed to update reading.');
  }
}
```

- [ ] **Step 4: Create `SetSuspectDto`**

```ts
// src/air-quality/dto/set-suspect.dto.ts
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetSuspectDto {
  @ApiProperty({ description: 'Whether this reading should be flagged suspect', example: true })
  @IsBoolean()
  isSuspect: boolean;

  @ApiProperty({ description: 'Why this reading is suspect', example: 'Sensor drift suspected', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  suspectReason?: string;
}
```

- [ ] **Step 5: Add `setSuspectFlag` to `AirQualityService`**

```ts
// src/air-quality/air-quality.service.ts — add this method, after createReading
async setSuspectFlag(id: string, isSuspect: boolean, suspectReason: string | null, userId: string) {
  try {
    const existing = await this.airQualityRepo.findById(id);
    if (!existing) throw new NotFoundException(`Reading with ID ${id} not found`);

    const updated = await this.airQualityRepo.update(id, { isSuspect, suspectReason });
    await this.auditLog.log({
      userId,
      action: 'flag_suspect',
      resource: 'AirQuality',
      resourceId: id,
      changes: { isSuspect, suspectReason },
    });
    return plainToInstance(AirQualityReadingResponseDto, updated, { excludeExtraneousValues: true });
  } catch (error: unknown) {
    if (error instanceof NotFoundException) throw error;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Failed to set suspect flag for reading ${id}: ${msg}`);
    throw new InternalServerErrorException('Failed to update suspect flag.');
  }
}
```

- [ ] **Step 6: Add the route**

```ts
// src/air-quality/air-quality.controller.ts — add imports and this route, after create()
import { UseGuards } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
import { ApiKeyGuard } from '../common/guards/api-key.guard.js';
import { SetSuspectDto } from './dto/set-suspect.dto.js';
// ... (merge into the existing import blocks rather than duplicating)

@Patch(':id/suspect')
@UseGuards(ApiKeyGuard)
@ApiHeader({ name: 'x-api-key', required: true, description: 'Admin API key' })
@ApiOperation({ summary: 'Flag or unflag a reading as suspect (requires admin API key)' })
@ApiBody({ type: SetSuspectDto })
async setSuspect(@Param('id') id: string, @Body() body: SetSuspectDto) {
  this.logger.log(`Request to set suspect flag on reading ${id}: ${body.isSuspect}`);
  // ApiKeyGuard already rejected this request if the key didn't match - always "admin" here.
  return this.airQualityService.setSuspectFlag(id, body.isSuspect, body.suspectReason ?? null, 'admin');
}
```

Add `Patch` to the existing `@nestjs/common` import line in this file (currently imports `Controller, Get, Post, Param, Body, Query, ParseIntPipe, Req, Logger` — add `Patch`, `UseGuards`).

- [ ] **Step 7: Run tests to verify they pass**

Run: `npx jest air-quality-suspect-flag`
Expected: both pass.

- [ ] **Step 8: Run the full suite and build**

Run: `npm test && npm run build`
Expected: all pass.

- [ ] **Step 9: Commit**

```bash
git add src/air-quality/air-quality.repository.ts src/air-quality/dto/set-suspect.dto.ts \
  src/air-quality/air-quality.service.ts src/air-quality/air-quality.controller.ts \
  test/air-quality-suspect-flag.spec.ts
git commit -m "feat: add admin-gated PATCH /air-quality/:id/suspect to flag readings without deleting them"
```

---

### Task 3: Duplicate detection

**Files:**
- Modify: `src/air-quality/air-quality.service.ts`
- Modify: `src/air-quality/air-quality.controller.ts`
- Test: `test/air-quality-duplicates.spec.ts`

**Interfaces:**
- Produces: `AirQualityService.findDuplicates(city): Promise<{ stationId: number; pollutants: {...}; readingIds: string[]; count: number }[]>`. `GET /air-quality/city/:city/duplicates`, public.

- [ ] **Step 1: Write the failing test**

```ts
// test/air-quality-duplicates.spec.ts
import { Test } from '@nestjs/testing';
import { AirQualityService } from '../src/air-quality/air-quality.service.js';
import { AirQualityRepository } from '../src/air-quality/air-quality.repository.js';
import { StationRepository } from '../src/stations/station.repository.js';
import { AuditLogService } from '../src/common/audit/audit-log.service.js';

describe('AirQualityService.findDuplicates', () => {
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

  const base = { pm25: 12, pm10: 20, co: null, no2: null, o3: null, so2: null };

  it('groups two readings with identical pollutant values within 60 seconds', async () => {
    const t0 = new Date('2026-08-02T10:00:00.000Z');
    const t1 = new Date('2026-08-02T10:00:30.000Z'); // 30s later
    const service = await buildService([
      { id: 'a', stationId: 1, createdAt: t0, ...base },
      { id: 'b', stationId: 1, createdAt: t1, ...base },
    ]);

    const result = await service.findDuplicates('Lagos');

    expect(result.length).toBe(1);
    expect(result[0]).toEqual(
      expect.objectContaining({ stationId: 1, readingIds: expect.arrayContaining(['a', 'b']), count: 2 }),
    );
  });

  it('does not group readings more than 60 seconds apart', async () => {
    const t0 = new Date('2026-08-02T10:00:00.000Z');
    const t1 = new Date('2026-08-02T10:05:00.000Z'); // 5 minutes later
    const service = await buildService([
      { id: 'a', stationId: 1, createdAt: t0, ...base },
      { id: 'b', stationId: 1, createdAt: t1, ...base },
    ]);

    const result = await service.findDuplicates('Lagos');
    expect(result.length).toBe(0);
  });

  it('does not group readings with different pollutant values', async () => {
    const t0 = new Date('2026-08-02T10:00:00.000Z');
    const t1 = new Date('2026-08-02T10:00:10.000Z');
    const service = await buildService([
      { id: 'a', stationId: 1, createdAt: t0, ...base },
      { id: 'b', stationId: 1, createdAt: t1, ...base, pm25: 99 },
    ]);

    const result = await service.findDuplicates('Lagos');
    expect(result.length).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest air-quality-duplicates`
Expected: FAIL — `findDuplicates` doesn't exist.

- [ ] **Step 3: Implement `findDuplicates`**

```ts
// src/air-quality/air-quality.service.ts — add this method, after getHazardousReadings
private static readonly DUPLICATE_WINDOW_MS = 60_000;

async findDuplicates(city: string) {
  try {
    const readings = await this.airQualityRepo.findAll({ city });
    const groups = new Map<string, AirQuality[]>();

    for (const r of readings) {
      const key = `${r.stationId}|${r.pm25}|${r.pm10}|${r.co}|${r.no2}|${r.o3}|${r.so2}`;
      const group = groups.get(key) ?? [];
      group.push(r);
      groups.set(key, group);
    }

    const duplicates: { stationId: number; pollutants: Record<string, number | null>; readingIds: string[]; count: number }[] = [];
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      const times = group.map((r) => r.createdAt.getTime());
      const span = Math.max(...times) - Math.min(...times);
      if (span > AirQualityService.DUPLICATE_WINDOW_MS) continue;

      const [first] = group;
      duplicates.push({
        stationId: first.stationId,
        pollutants: { pm25: first.pm25, pm10: first.pm10, co: first.co, no2: first.no2, o3: first.o3, so2: first.so2 },
        readingIds: group.map((r) => r.id),
        count: group.length,
      });
    }

    return duplicates;
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Failed to find duplicates for city ${city}: ${msg}`);
    throw new InternalServerErrorException('Failed to find duplicate readings.');
  }
}
```

- [ ] **Step 4: Add the route**

```ts
// src/air-quality/air-quality.controller.ts — add this route, after hazardous()
@Get('city/:city/duplicates')
@ApiOperation({ summary: 'Find candidate duplicate readings for a city (same station, identical pollutant values, within 60s)' })
async duplicates(@Param('city') city: string) {
  this.logger.log(`Request to find duplicate readings for city: ${city}`);
  return this.airQualityService.findDuplicates(city);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest air-quality-duplicates`
Expected: all 3 pass.

- [ ] **Step 6: Run the full suite and build**

Run: `npm test && npm run build`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/air-quality/air-quality.service.ts src/air-quality/air-quality.controller.ts \
  test/air-quality-duplicates.spec.ts
git commit -m "feat: add GET /air-quality/city/:city/duplicates for candidate-duplicate review"
```

---

### Task 4: Station completeness

**Files:**
- Modify: `src/stations/station.module.ts`
- Modify: `src/stations/station.service.ts`
- Modify: `src/stations/station.controller.ts`
- Test: `test/station-completeness.spec.ts`

**Interfaces:**
- Consumes: `AirQualityRepository.findAll({ stationId, since })` (already exists, unchanged).
- Produces: `StationService.getCompleteness(id, hours = 24): Promise<{ applicable: false; stationId: number } | { applicable: true; stationId: number; windowHours: number; hoursWithReadings: number; completenessPercent: number }>`. `GET /stations/:id/completeness?hours=`, public.

- [ ] **Step 1: Write the failing test**

```ts
// test/station-completeness.spec.ts
import { Test } from '@nestjs/testing';
import { StationService } from '../src/stations/station.service.js';
import { StationRepository } from '../src/stations/station.repository.js';
import { AirQualityRepository } from '../src/air-quality/air-quality.repository.js';
import { AuditLogService } from '../src/common/audit/audit-log.service.js';

describe('StationService.getCompleteness', () => {
  const buildService = async (station: any, readings: any[]) => {
    const findById = jest.fn().mockResolvedValue(station);
    const findAll = jest.fn().mockResolvedValue(readings);
    const module = await Test.createTestingModule({
      providers: [
        StationService,
        { provide: StationRepository, useValue: { findById } },
        { provide: AirQualityRepository, useValue: { findAll } },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();
    return { service: module.get(StationService), findAll };
  };

  it('returns applicable: false for a local station', async () => {
    const { service } = await buildService({ id: 1, source: 'local' }, []);
    const result = await service.getCompleteness(1, 24);
    expect(result).toEqual({ applicable: false, stationId: 1 });
  });

  it('computes completeness percent for an openaq station', async () => {
    // 24-hour window, readings in 3 distinct hour-buckets out of 24
    const readings = [
      { createdAt: new Date('2026-08-02T00:15:00.000Z') },
      { createdAt: new Date('2026-08-02T01:05:00.000Z') },
      { createdAt: new Date('2026-08-02T01:50:00.000Z') }, // same hour bucket as above
      { createdAt: new Date('2026-08-02T02:00:00.000Z') },
    ];
    const { service, findAll } = await buildService({ id: 2, source: 'openaq' }, readings);

    const result = await service.getCompleteness(2, 24);

    expect(findAll).toHaveBeenCalledWith(expect.objectContaining({ stationId: 2 }));
    expect(result).toEqual({
      applicable: true,
      stationId: 2,
      windowHours: 24,
      hoursWithReadings: 3,
      completenessPercent: 12.5, // 3/24 * 100, rounded to 1 decimal
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest station-completeness`
Expected: FAIL — `getCompleteness` doesn't exist; `StationService` doesn't inject `AirQualityRepository` yet.

- [ ] **Step 3: Add `AirQualityRepository` to `StationModule`**

```ts
// src/stations/station.module.ts — full replacement
import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { StationRepository } from './station.repository.js';
import { StationService } from './station.service.js';
import { StationController } from './station.controller.js';
import { ApiKeyGuard } from '../common/guards/api-key.guard.js';
import { AuditLogService } from '../common/audit/audit-log.service.js';
import { AirQualityRepository } from '../air-quality/air-quality.repository.js';

@Module({
  controllers: [StationController],
  providers: [PrismaService, StationRepository, StationService, ApiKeyGuard, AuditLogService, AirQualityRepository],
  exports: [StationService],
})
export class StationModule {}
```

(This mirrors the existing convention in this codebase — `AirQualityModule` already provides `StationRepository` directly as a cross-module provider, rather than importing `StationModule`. Same pattern, opposite direction.)

- [ ] **Step 4: Add `getCompleteness` to `StationService`**

```ts
// src/stations/station.service.ts — add this import
import { AirQualityRepository } from '../air-quality/air-quality.repository.js';

// add airQualityRepo to the constructor
constructor(
  private readonly stationRepo: StationRepository,
  private readonly auditLog: AuditLogService,
  private readonly airQualityRepo: AirQualityRepository,
) {}

// add this method, after getUnifiedStations
private static readonly MAX_COMPLETENESS_WINDOW_HOURS = 720; // mirrors AirQualityService.MAX_WINDOW_HOURS

async getCompleteness(id: number, hours = 24) {
  const safeHours = Math.min(hours, StationService.MAX_COMPLETENESS_WINDOW_HOURS);
  const station = await this.getStationById(id); // throws NotFoundException if missing

  if (station.source !== 'openaq') {
    return { applicable: false as const, stationId: id };
  }

  const since = new Date(Date.now() - safeHours * 60 * 60 * 1000);
  try {
    const readings = await this.airQualityRepo.findAll({ stationId: id, since });
    const hourBuckets = new Set(readings.map((r) => Math.floor(r.createdAt.getTime() / (60 * 60 * 1000))));
    const hoursWithReadings = hourBuckets.size;
    const completenessPercent = Math.round((hoursWithReadings / safeHours) * 1000) / 10;

    return {
      applicable: true as const,
      stationId: id,
      windowHours: safeHours,
      hoursWithReadings,
      completenessPercent,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Failed to compute completeness for station ${id}. Error: ${errorMessage}`);
    throw new InternalServerErrorException('Failed to compute station completeness.');
  }
}
```

- [ ] **Step 5: Add the route**

```ts
// src/stations/station.controller.ts — add these imports and this route, after getUnifiedStations
// (safe to place anywhere relative to :id since /:id/completeness is a distinct two-segment
// path that :id's single-segment route can never shadow - no reordering needed here, unlike
// the P0 /stations/unified fix)
import { ApiQuery } from '@nestjs/swagger';
// ... merge into existing @nestjs/swagger import line

@Get(':id/completeness')
@ApiOperation({ summary: 'Get reporting completeness for an OpenAQ-synced station over a recent window (default 24h)' })
@ApiQuery({ name: 'hours', required: false, type: Number })
async completeness(@Param('id', ParseIntPipe) id: number, @Query('hours', new ParseIntPipe({ optional: true })) hours?: number) {
  this.logger.log(`Request for completeness on station ${id}`);
  return this.stationService.getCompleteness(id, hours);
}
```

Add `ParseIntPipe`'s optional usage matches the existing pattern from `air-quality.controller.ts`'s `hours` query param (P0 Task 5's fix) — `ParseIntPipe` is already imported in this file.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx jest station-completeness`
Expected: both pass.

- [ ] **Step 7: Run the full suite and build**

Run: `npm test && npm run build`
Expected: `StationService`'s constructor now takes a third parameter (`AirQualityRepository`). `test/station-service-pagination.spec.ts` builds `StationService` via an explicit `Test.createTestingModule` provider list (not the real `StationModule`), so it will very likely fail DI resolution the same way `test/station-service-pagination.spec.ts`/`test/air-quality-windowed.spec.ts` did in P1 Task 2 when `AuditLogService` was added. If it fails with "can't resolve dependencies ... AirQualityRepository", add `{ provide: AirQualityRepository, useValue: {} }` to that test's provider list (it doesn't call `getCompleteness`, so an empty mock is enough) — verify by running, don't assume it's fine.

- [ ] **Step 8: Document all four P2 additions in the README**

Add under "API Usage" in `README.md`:

```markdown
### 🧪 Reading metadata

`POST /air-quality/station/:stationId` now accepts optional `instrumentModel`,
`calibrationDate`, `samplingDurationMinutes`, `weatherConditions`, `temperature`, and
`humidity` fields alongside the pollutant values — all returned back on every reading.

### 🚩 Suspect flag

`PATCH /air-quality/:id/suspect` (admin key required) marks a reading `{ isSuspect, suspectReason }`
without deleting it — research data is never destroyed, only annotated.

### 🔁 Duplicate detection

`GET /air-quality/city/:city/duplicates` (public) surfaces candidate duplicate readings —
same station, identical pollutant values, submitted within 60 seconds of each other — for a
human to review. Nothing is auto-flagged or auto-deleted.

### 📊 Completeness

`GET /stations/:id/completeness?hours=` (public, default 24h) reports what fraction of
expected hours an OpenAQ-synced station actually reported in. Local stations return
`{ applicable: false }` — there's no fixed cadence to measure a field visit against.
```

- [ ] **Step 9: Commit**

```bash
git add src/stations/station.module.ts src/stations/station.service.ts \
  src/stations/station.controller.ts README.md test/station-completeness.spec.ts
git commit -m "feat: add GET /stations/:id/completeness for OpenAQ-synced stations"
```

---

## Post-plan acceptance check (run once all tasks are done)

- [ ] `POST /air-quality/station/:id` with instrument/calibration/weather/temp/humidity fields → all returned back on the response, `isSuspect: false`, `suspectReason: null`
- [ ] `PATCH /air-quality/:id/suspect` without `x-api-key` → 401
- [ ] `PATCH /air-quality/:id/suspect` with a valid key → `isSuspect`/`suspectReason` updated, an `AuditLog` row with `action: 'flag_suspect'` appears
- [ ] Submit two identical readings on the same station within 60s → `GET .../duplicates` groups them; 5+ minutes apart → not grouped
- [ ] `GET /stations/:id/completeness` on a local station → `{ applicable: false }`; on an OpenAQ station → a real percentage
- [ ] `npm run build` and `npm test` both pass
- [ ] Swagger at `/docs` shows all new fields/routes
