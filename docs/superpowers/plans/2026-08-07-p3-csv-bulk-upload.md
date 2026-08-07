# P3: CSV Bulk Upload / Offline Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a field researcher upload a whole trip's worth of offline-captured readings in one CSV, each dated to when it was actually measured — not when the upload happened to sync.

**Architecture:** One new nullable schema field (`measuredAt`), updates to the four existing P2 time-windowed queries to prefer it over `createdAt`, and one new endpoint that parses a CSV and calls the existing `createReading` per row (reusing all its validation/audit logic, not a parallel path).

**Tech Stack:** NestJS 11, Prisma 6, class-validator/class-transformer, Jest — unchanged from P0-P2. New dependency: `csv-parse` (CSV parsing). A real Postgres is reachable via `.env` for real migrations.

## Global Constraints

- `createdAt` keeps its exact current meaning everywhere (server receipt time, `@default(now())`) — nothing in this plan changes what it means or how it's set. Only `measuredAt` is new.
- Every time-windowed query that currently filters/buckets by `createdAt` must switch to "prefer `measuredAt`, fall back to `createdAt` when null" — expressed via Prisma's query builder (`OR` clauses), not raw SQL (`$queryRaw`), consistent with how this codebase avoids raw SQL everywhere else.
- `findDuplicates`'s 60-second span check must also use `measuredAt ?? createdAt`, not just its window filter — both need to agree on which timestamp represents "when this happened," or a re-uploaded CSV silently fails to be caught as a duplicate.
- CSV bulk upload is public (no admin key) — same auth level as the existing single-reading `POST`, not a judgment-consequence mutation like delete or suspect-flag.
- Bulk upload is partial-success: valid rows insert, invalid rows are reported with their row number and reason, one bad row never blocks the rest of the batch.
- Row cap: uploads over `MAX_CSV_ROWS` (1000) are rejected outright, nothing inserted.
- Reuse `AirQualityService.createReading` for every row's insert — do not write a parallel bulk-insert path. Every row gets identical validation, audit logging, and response shape to a single POST.

---

### Task 1: `measuredAt` field — schema, migration, `createReading` passthrough

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/air-quality/air-quality.service.ts`
- Test: `test/air-quality-measured-at.spec.ts`

**Interfaces:**
- Produces: `AirQuality.measuredAt DateTime?`. `AirQualityService.createReading`'s signature gains a 5th optional parameter: `measuredAt?: Date | null`, passed straight through to `airQualityRepo.create`. Existing callers (single-POST controller, both OpenAQ sync call sites) are unaffected — the parameter is optional and they don't pass it, exactly like `userId` already works.

- [ ] **Step 1: Write the failing test**

```ts
// test/air-quality-measured-at.spec.ts
import { Test } from '@nestjs/testing';
import { AirQualityService } from '../src/air-quality/air-quality.service.js';
import { AirQualityRepository } from '../src/air-quality/air-quality.repository.js';
import { StationRepository } from '../src/stations/station.repository.js';
import { AuditLogService } from '../src/common/audit/audit-log.service.js';

describe('AirQualityService.createReading measuredAt', () => {
  const buildService = async () => {
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
    return { service: module.get(AirQualityService), create };
  };

  const reading = { pm25: 10, pm10: null, co: null, no2: null, o3: null, so2: null };

  it('passes measuredAt through to the repository when provided', async () => {
    const { service, create } = await buildService();
    const measuredAt = new Date('2026-07-15T09:00:00.000Z');

    await service.createReading(1, reading, 'local', 'public', measuredAt);

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ measuredAt }));
  });

  it('defaults measuredAt to null when omitted', async () => {
    const { service, create } = await buildService();

    await service.createReading(1, reading, 'local', 'public');

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ measuredAt: null }));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest air-quality-measured-at`
Expected: FAIL — `createReading` doesn't accept a 5th parameter yet, and `airQualityRepo.create` is never called with `measuredAt`.

- [ ] **Step 3: Add the field to the schema and migrate**

```prisma
// prisma/schema.prisma — AirQuality model, add one field after so2
model AirQuality {
  id        String   @id @default(uuid())
  stationId Int
  createdAt DateTime @default(now())
  measuredAt DateTime?
  co        Float?
  no2       Float?
  o3        Float?
  so2       Float?
  pm10      Float?
  pm25      Float?
  station   Station  @relation(fields: [stationId], references: [id])
  source    String   @default("local")

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

Run: `npx prisma migrate dev --name air_quality_measured_at`
Expected: Prisma generates and applies `ALTER TABLE "AirQuality" ADD COLUMN "measuredAt" TIMESTAMP(3);` against the real DB reachable via `.env`.

- [ ] **Step 4: Add `measuredAt` to `createReading`**

```ts
// src/air-quality/air-quality.service.ts — replace createReading's signature and body
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
  measuredAt?: Date | null,
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
      measuredAt: measuredAt ?? null,
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

(Only the signature and the `airQualityRepo.create` call change — everything else in the method is untouched.)

- [ ] **Step 5: Expose `measuredAt` on the response DTO**

```ts
// src/air-quality/dto/air-quality-response.dto.ts — add to AirQualityReadingResponseDto,
// after the humidity field and before isSuspect
  @ApiProperty({ description: 'When this reading was actually measured (if different from when the server received it)', example: '2026-07-15T09:00:00.000Z', nullable: true })
  @Expose()
  measuredAt: Date | null;
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx jest air-quality-measured-at`
Expected: both pass.

- [ ] **Step 7: Run the full suite and build**

Run: `npm test && npm run build`
Expected: all pass, build exits 0.

- [ ] **Step 8: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/air-quality/air-quality.service.ts \
  src/air-quality/dto/air-quality-response.dto.ts test/air-quality-measured-at.spec.ts
git commit -m "feat: add measuredAt to readings for offline/bulk-captured data"
```

---

### Task 2: Make the four P2 time-windowed queries `measuredAt`-aware

**Files:**
- Modify: `src/air-quality/air-quality.repository.ts`
- Modify: `src/air-quality/air-quality.service.ts`
- Modify: `src/stations/station.service.ts`
- Test: `test/air-quality-measured-at-windowing.spec.ts`

**Interfaces:**
- Consumes: `AirQuality.measuredAt` (Task 1).
- Produces: `AirQualityRepository.findAll`'s `since` filter and `aggregateByCity`'s window now match `measuredAt` when set, `createdAt` otherwise. `AirQualityService.findDuplicates`'s 60-second span check and `StationService.getCompleteness`'s hour-bucketing do the same.

- [ ] **Step 1: Write the failing test**

```ts
// test/air-quality-measured-at-windowing.spec.ts
import { Test } from '@nestjs/testing';
import { AirQualityService } from '../src/air-quality/air-quality.service.js';
import { AirQualityRepository } from '../src/air-quality/air-quality.repository.js';
import { StationRepository } from '../src/stations/station.repository.js';
import { StationService } from '../src/stations/station.service.js';
import { AuditLogService } from '../src/common/audit/audit-log.service.js';

describe('measuredAt-aware windowing', () => {
  it('findAll filters by measuredAt when present, createdAt as fallback', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const { AirQualityRepository: RealRepo } = await import('../src/air-quality/air-quality.repository.js');
    const { PrismaService } = await import('../src/prisma/prisma.service.js');
    const repo = new RealRepo({ airQuality: { findMany } } as unknown as InstanceType<typeof PrismaService>);
    const since = new Date('2026-07-01T00:00:00.000Z');

    await repo.findAll({ city: 'Lagos', since });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { measuredAt: { gte: since } },
            { measuredAt: null, createdAt: { gte: since } },
          ],
        }),
      }),
    );
  });

  it('findDuplicates groups by measuredAt span when present, not createdAt', async () => {
    // measuredAt identical (same field-trip day), createdAt hours apart (re-uploaded later)
    const measuredAt = new Date('2026-07-15T09:00:00.000Z');
    const readings = [
      { id: 'a', stationId: 1, pm25: 12, pm10: 20, co: null, no2: null, o3: null, so2: null, measuredAt, createdAt: new Date('2026-07-15T09:05:00.000Z') },
      { id: 'b', stationId: 1, pm25: 12, pm10: 20, co: null, no2: null, o3: null, so2: null, measuredAt, createdAt: new Date('2026-07-16T14:00:00.000Z') },
    ];
    const findAll = jest.fn().mockResolvedValue(readings);
    const module = await Test.createTestingModule({
      providers: [
        AirQualityService,
        { provide: AirQualityRepository, useValue: { findAll } },
        { provide: StationRepository, useValue: {} },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();
    const service = module.get(AirQualityService);

    const result = await service.findDuplicates('Lagos');

    expect(result.length).toBe(1);
    expect(result[0].count).toBe(2);
  });

  it('getCompleteness buckets by measuredAt when present, not createdAt', async () => {
    const findById = jest.fn().mockResolvedValue({ id: 1, source: 'openaq' });
    // All three readings synced (createdAt) within the same minute, but measuredAt
    // spread across 3 distinct hours - completeness should reflect the real spread.
    const now = new Date();
    const readings = [
      { createdAt: now, measuredAt: new Date('2026-08-01T00:15:00.000Z') },
      { createdAt: now, measuredAt: new Date('2026-08-01T01:05:00.000Z') },
      { createdAt: now, measuredAt: new Date('2026-08-01T02:00:00.000Z') },
    ];
    const findAll = jest.fn().mockResolvedValue(readings);
    const module = await Test.createTestingModule({
      providers: [
        StationService,
        { provide: StationRepository, useValue: { findById } },
        { provide: AirQualityRepository, useValue: { findAll } },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();
    const service = module.get(StationService);

    const result = await service.getCompleteness(1, 24);

    expect(result).toEqual(
      expect.objectContaining({ applicable: true, hoursWithReadings: 3 }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest air-quality-measured-at-windowing`
Expected: FAIL — `findAll`'s where clause has no `OR`; `findDuplicates` groups the two readings as NOT duplicates (their `createdAt` values are >60s apart); `getCompleteness` reports `hoursWithReadings: 1` (all three readings share the same `createdAt` bucket).

- [ ] **Step 3: Update `AirQualityRepository.findAll` and `aggregateByCity`**

```ts
// src/air-quality/air-quality.repository.ts — findAll, replace the where block
async findAll(filter?: { city?: string; stationId?: number; since?: Date }): Promise<AirQuality[]> {
  this.logger.log(`Fetching all readings with filter: ${JSON.stringify(filter)}`);
  try {
    const result = await this.prisma.airQuality.findMany({
      where: {
        ...(filter?.city && { station: { city: filter.city } }),
        ...(filter?.stationId && { stationId: filter.stationId }),
        ...(filter?.since && {
          OR: [
            { measuredAt: { gte: filter.since } },
            { measuredAt: null, createdAt: { gte: filter.since } },
          ],
        }),
      },
      orderBy: { createdAt: 'desc' },
    });
    this.logger.log(`Found ${result.length} readings.`);
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Failed to fetch all readings. Error: ${errorMessage}`);
    throw new InternalServerErrorException('Failed to retrieve all readings.');
  }
}
```

```ts
// src/air-quality/air-quality.repository.ts — aggregateByCity, replace the where block
async aggregateByCity(city: string, since: Date) {
  this.logger.log(`Aggregating air quality for city: ${city} since ${since.toISOString()}`);
  try {
    const result = await this.prisma.airQuality.aggregate({
      where: {
        station: { city },
        OR: [
          { measuredAt: { gte: since } },
          { measuredAt: null, createdAt: { gte: since } },
        ],
      },
      _avg: { pm25: true, pm10: true, no2: true, o3: true },
      _count: true,
    });
    this.logger.log(`Aggregation complete for city: ${city}`);
    return result;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Failed to aggregate by city ${city}. Error: ${errorMessage}`);
    throw new InternalServerErrorException('Failed to perform city aggregation.');
  }
}
```

(`getHazardousReadings` and `getAveragePollutionByCity` in `air-quality.service.ts` call `findAll`/`aggregateByCity` with a `since` argument already — neither method needs its own code changed, they inherit the fix automatically through the repository.)

- [ ] **Step 4: Update `findDuplicates`'s span check**

```ts
// src/air-quality/air-quality.service.ts — findDuplicates, replace only this line
const times = group.map((r) => (r.measuredAt ?? r.createdAt).getTime());
```

(Everything else in `findDuplicates` — the grouping key, the `since` filter passed to `findAll`, the response shape — is unchanged.)

- [ ] **Step 5: Update `getCompleteness`'s hour-bucketing**

```ts
// src/stations/station.service.ts — getCompleteness, replace only this line
const hourBuckets = new Set(readings.map((r) => Math.floor((r.measuredAt ?? r.createdAt).getTime() / (60 * 60 * 1000))));
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx jest air-quality-measured-at-windowing`
Expected: all 3 pass.

- [ ] **Step 7: Run the full suite and build**

Run: `npm test && npm run build`
Expected: all pass. `test/air-quality-duplicates.spec.ts` and `test/station-completeness.spec.ts` (from P2) don't set `measuredAt` on their fixture readings, so they exercise the `?? createdAt` fallback path — confirm they still pass unmodified.

- [ ] **Step 8: Commit**

```bash
git add src/air-quality/air-quality.repository.ts src/air-quality/air-quality.service.ts \
  src/stations/station.service.ts test/air-quality-measured-at-windowing.spec.ts
git commit -m "fix: window average/hazardous/duplicates/completeness by measuredAt when present"
```

---

### Task 3: CSV bulk upload endpoint

**Files:**
- Modify: `package.json`
- Modify: `src/air-quality/air-quality.service.ts`
- Modify: `src/air-quality/air-quality.controller.ts`
- Modify: `README.md`
- Test: `test/air-quality-bulk-upload.spec.ts`

**Interfaces:**
- Consumes: `AirQualityService.createReading` (Task 1's `measuredAt` param), `CreateAirQualityDto` (P2, unchanged).
- Produces: `AirQualityService.bulkUploadFromCsv(rows: Record<string, string>[], userId: string): Promise<{ inserted: number; errors: { row: number; message: string }[] }>`. `POST /air-quality/bulk-upload`, multipart file upload, public.

- [ ] **Step 1: Add the CSV parsing dependency**

```bash
npm install csv-parse
```

Expected: `package.json`'s `dependencies` gains `"csv-parse": "^5.6.0"` (or whatever the installed version resolves to — use what `npm install` actually writes).

- [ ] **Step 2: Write the failing test**

```ts
// test/air-quality-bulk-upload.spec.ts
import { Test } from '@nestjs/testing';
import { AirQualityService } from '../src/air-quality/air-quality.service.js';
import { AirQualityRepository } from '../src/air-quality/air-quality.repository.js';
import { StationRepository } from '../src/stations/station.repository.js';
import { AuditLogService } from '../src/common/audit/audit-log.service.js';

describe('AirQualityService.bulkUploadFromCsv', () => {
  const buildService = async (findByIdImpl: (id: number) => any = () => ({ id: 1 })) => {
    const findById = jest.fn().mockImplementation(findByIdImpl);
    const create = jest.fn().mockResolvedValue({ id: 'r1', stationId: 1 });
    const module = await Test.createTestingModule({
      providers: [
        AirQualityService,
        { provide: AirQualityRepository, useValue: { create } },
        { provide: StationRepository, useValue: { findById } },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();
    return module.get(AirQualityService);
  };

  it('inserts every valid row and reports zero errors', async () => {
    const service = await buildService();
    const rows = [
      { stationId: '1', measuredAt: '2026-07-15T09:00:00.000Z', pm25: '12', pm10: '20' },
      { stationId: '1', measuredAt: '2026-07-15T10:00:00.000Z', pm25: '14', pm10: '22' },
    ];

    const result = await service.bulkUploadFromCsv(rows, 'public');

    expect(result).toEqual({ inserted: 2, errors: [] });
  });

  it('reports a per-row error for an invalid stationId and still inserts the valid rows', async () => {
    const service = await buildService();
    const rows = [
      { stationId: 'not-a-number', measuredAt: '2026-07-15T09:00:00.000Z', pm25: '12' },
      { stationId: '1', measuredAt: '2026-07-15T10:00:00.000Z', pm25: '14' },
    ];

    const result = await service.bulkUploadFromCsv(rows, 'public');

    expect(result.inserted).toBe(1);
    expect(result.errors).toEqual([{ row: 2, message: expect.stringContaining('stationId') }]);
  });

  it('reports a per-row error for a missing measuredAt', async () => {
    const service = await buildService();
    const rows = [{ stationId: '1', measuredAt: '', pm25: '12' }];

    const result = await service.bulkUploadFromCsv(rows, 'public');

    expect(result.inserted).toBe(0);
    expect(result.errors).toEqual([{ row: 2, message: expect.stringContaining('measuredAt') }]);
  });

  it('reports a per-row error when the station does not exist, via createReading\'s own 404', async () => {
    const service = await buildService(() => null);
    const rows = [{ stationId: '999', measuredAt: '2026-07-15T09:00:00.000Z', pm25: '12' }];

    const result = await service.bulkUploadFromCsv(rows, 'public');

    expect(result.inserted).toBe(0);
    expect(result.errors).toEqual([{ row: 2, message: expect.stringContaining('999') }]);
  });

  it('rejects an oversized upload outright, before processing any row', async () => {
    const service = await buildService();
    const rows = Array.from({ length: 1001 }, (_, i) => ({ stationId: '1', measuredAt: '2026-07-15T09:00:00.000Z', pm25: String(i) }));

    await expect(service.bulkUploadFromCsv(rows, 'public')).rejects.toThrow('1000');
  });

  it('returns an empty summary for a header-only (zero-row) upload', async () => {
    const service = await buildService();

    const result = await service.bulkUploadFromCsv([], 'public');

    expect(result).toEqual({ inserted: 0, errors: [] });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest air-quality-bulk-upload`
Expected: FAIL — `bulkUploadFromCsv` doesn't exist.

- [ ] **Step 4: Implement `bulkUploadFromCsv`**

```ts
// src/air-quality/air-quality.service.ts — add these imports at the top
import { plainToInstance } from 'class-transformer'; // already imported - do not duplicate
import { validate } from 'class-validator';
import { BadRequestException } from '@nestjs/common'; // merge into the existing @nestjs/common import
import { CreateAirQualityDto } from './dto/create-reading.dto.js';

// add this constant near the other private statics
private static readonly MAX_CSV_ROWS = 1000;

// add this method, after findDuplicates
async bulkUploadFromCsv(rows: Record<string, string>[], userId: string) {
  if (rows.length > AirQualityService.MAX_CSV_ROWS) {
    throw new BadRequestException(
      `CSV has ${rows.length} rows, exceeding the maximum of ${AirQualityService.MAX_CSV_ROWS}`,
    );
  }

  const errors: { row: number; message: string }[] = [];
  let inserted = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowNumber = i + 2; // +1 for 0-index, +1 for the header row
    const raw = rows[i];
    try {
      const stationId = Number(raw.stationId);
      if (!Number.isInteger(stationId) || stationId < 1) {
        throw new Error(`Invalid stationId "${raw.stationId}"`);
      }
      if (!raw.measuredAt) {
        throw new Error('measuredAt is required');
      }
      const measuredAt = new Date(raw.measuredAt);
      if (Number.isNaN(measuredAt.getTime())) {
        throw new Error(`Invalid measuredAt "${raw.measuredAt}"`);
      }

      const dto = plainToInstance(CreateAirQualityDto, {
        pm25: raw.pm25 ? Number(raw.pm25) : undefined,
        pm10: raw.pm10 ? Number(raw.pm10) : undefined,
        co: raw.co ? Number(raw.co) : undefined,
        no2: raw.no2 ? Number(raw.no2) : undefined,
        o3: raw.o3 ? Number(raw.o3) : undefined,
        so2: raw.so2 ? Number(raw.so2) : undefined,
        instrumentModel: raw.instrumentModel || undefined,
        calibrationDate: raw.calibrationDate || undefined,
        samplingDurationMinutes: raw.samplingDurationMinutes ? Number(raw.samplingDurationMinutes) : undefined,
        weatherConditions: raw.weatherConditions || undefined,
        temperature: raw.temperature ? Number(raw.temperature) : undefined,
        humidity: raw.humidity ? Number(raw.humidity) : undefined,
      });
      const validationErrors = await validate(dto);
      if (validationErrors.length > 0) {
        const message = validationErrors
          .map((e) => Object.values(e.constraints ?? {}).join(', '))
          .join('; ');
        throw new Error(message);
      }

      await this.createReading(
        stationId,
        {
          pm25: dto.pm25 ?? null,
          pm10: dto.pm10 ?? null,
          co: dto.co ?? null,
          no2: dto.no2 ?? null,
          o3: dto.o3 ?? null,
          so2: dto.so2 ?? null,
          instrumentModel: dto.instrumentModel ?? null,
          calibrationDate: dto.calibrationDate ? new Date(dto.calibrationDate) : null,
          samplingDurationMinutes: dto.samplingDurationMinutes ?? null,
          weatherConditions: dto.weatherConditions ?? null,
          temperature: dto.temperature ?? null,
          humidity: dto.humidity ?? null,
        },
        'local',
        userId,
        measuredAt,
      );
      inserted++;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      errors.push({ row: rowNumber, message });
    }
  }

  return { inserted, errors };
}
```

(`createReading`'s own `NotFoundException` for a missing station is caught by this method's per-row `try/catch` — its message already includes the station ID, so no special-casing is needed for that path.)

- [ ] **Step 5: Add the route**

```ts
// src/air-quality/air-quality.controller.ts — add these imports
import { UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common'; // merge into existing @nestjs/common import
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes } from '@nestjs/swagger'; // merge into existing @nestjs/swagger import
import { parse } from 'csv-parse/sync';

// add this route, after create()
@Post('bulk-upload')
@UseInterceptors(FileInterceptor('file'))
@ApiConsumes('multipart/form-data')
@ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
@ApiOperation({ summary: 'Bulk-upload readings from a CSV file (columns: stationId, measuredAt required; pollutants and metadata optional)' })
async bulkUpload(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
  if (!file) throw new BadRequestException('No file uploaded');

  let records: Record<string, string>[];
  try {
    records = parse(file.buffer, { columns: true, skip_empty_lines: true, trim: true });
  } catch (err: unknown) {
    throw new BadRequestException(`Could not parse CSV: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }

  const userId = isAdminRequest(req.headers, this.configService) ? 'admin' : 'public';
  return this.airQualityService.bulkUploadFromCsv(records, userId);
}
```

If `Express.Multer.File` doesn't resolve (TS error `Cannot find namespace 'Express'` or similar), run `npm install --save-dev @types/multer` and retry — `@nestjs/platform-express` depends on `multer` at runtime but its types aren't always pulled in transitively depending on the package manager's hoisting.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx jest air-quality-bulk-upload`
Expected: all 6 pass.

- [ ] **Step 7: Run the full suite and build**

Run: `npm test && npm run build`
Expected: all pass, build exits 0.

- [ ] **Step 8: Document the endpoint in the README**

Add under "API Usage" in `README.md`:

```markdown
### 📤 CSV bulk upload (offline capture)

`POST /air-quality/bulk-upload` (public, multipart `file` field) accepts a CSV of readings
captured offline and uploaded once back online. Required columns: `stationId`, `measuredAt`
(ISO 8601 — when the reading actually happened, not when it's uploaded). All `CreateAirQualityDto`
fields (pollutants + instrument/calibration/weather/temp/humidity metadata) are optional columns.
Capped at 1000 rows per upload. Partial success: `{ inserted: 42, errors: [{ row: 7, message: "..." }] }` —
one bad row never costs the rest of a multi-week field trip. Every P2 time-windowed endpoint
(average, hazardous, duplicates, completeness) reads these readings by `measuredAt`, so a
bulk-uploaded week shows up on the dates it actually happened.
```

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json src/air-quality/air-quality.service.ts \
  src/air-quality/air-quality.controller.ts README.md test/air-quality-bulk-upload.spec.ts
git commit -m "feat: add POST /air-quality/bulk-upload for CSV-based offline capture"
```

---

## Post-plan acceptance check (run once all tasks are done)

- [ ] Upload a CSV with 3 valid rows (different `measuredAt` dates spanning a week) → `{ inserted: 3, errors: [] }`
- [ ] `GET /air-quality/city/:city/average?hours=24` does NOT include a row `measuredAt` 2 weeks ago, even though it was just uploaded (`createdAt` = now)
- [ ] Upload a CSV with one row missing `measuredAt` and one valid row → `{ inserted: 1, errors: [{ row: 2, message: "..." }] }` (or row 3, whichever position the bad row is in)
- [ ] Upload the same valid CSV twice → `GET /air-quality/city/:city/duplicates` groups the re-uploaded rows (same `measuredAt`, same values) despite hours apart in `createdAt`
- [ ] Upload a CSV with >1000 rows → 400, nothing inserted
- [ ] `npm run build` and `npm test` both pass
- [ ] Swagger at `/docs` shows the multipart file upload form for `/air-quality/bulk-upload`
