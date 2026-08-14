# P4: Hazardous/Exceedance CSV Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a policy analyst download the hazardous/exceedance report for a city as a CSV, ready for a spreadsheet or report tool, without writing their own client to consume the JSON API.

**Architecture:** A small repository change (include station name), a small service change (surface it on the existing hazardous-readings response), a new pure CSV-formatting function, and a `?format=csv` branch on the existing `GET /air-quality/city/:city/hazardous` route.

**Tech Stack:** NestJS 11, Prisma 6 — unchanged from P0-P3. No new dependency (CSV is hand-formatted, per the design's YAGNI call — 9 fixed columns doesn't justify a library).

## Global Constraints

- No new route. `?format=csv` on the existing `GET /air-quality/city/:city/hazardous` — same auth level (public), same `?hours=` param.
- CSV row shape: **one row per exceedance**, not per reading. A reading with 2 exceedances produces 2 CSV rows.
- Columns, in order: `stationId, stationName, pollutant, value, limit, factor, measuredAt, isSuspect, readingId`. `measuredAt` uses `measuredAt ?? createdAt`, consistent with every other date-bearing field since P3.
- Any `format` value other than exactly `csv` (including absent) → existing JSON response, unchanged. Not an error.
- Empty result (no hazardous readings in the window) → CSV with header row only, not an error — same "empty is valid" precedent as P3's bulk upload.
- Values containing a comma, double-quote, or newline are quoted per RFC 4180 minimal quoting (double any embedded `"`, wrap the field in `"..."`).

---

### Task 1: Surface station name on hazardous readings

**Files:**
- Modify: `src/air-quality/air-quality.repository.ts`
- Modify: `src/air-quality/air-quality.service.ts`
- Modify: `src/air-quality/dto/air-quality-response.dto.ts`
- Test: `test/air-quality-hazardous-station-name.spec.ts`

**Interfaces:**
- Produces: `AirQualityRepository.findAll`'s return type becomes `Promise<(AirQuality & { station: { name: string } })[]>` — every returned reading carries its station's name. `AirQualityService.getHazardousReadings`'s returned objects gain a `stationName: string` field (already had `exceedances`). `HazardousReadingResponseDto` documents `stationName` in Swagger.

- [ ] **Step 1: Write the failing test**

```ts
// test/air-quality-hazardous-station-name.spec.ts
import { Test } from '@nestjs/testing';
import { AirQualityService } from '../src/air-quality/air-quality.service.js';
import { AirQualityRepository } from '../src/air-quality/air-quality.repository.js';
import { StationRepository } from '../src/stations/station.repository.js';
import { AuditLogService } from '../src/common/audit/audit-log.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('station name on hazardous readings', () => {
  it('findAll includes the related station name in the Prisma query', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const repo = new AirQualityRepository({ airQuality: { findMany } } as unknown as PrismaService);

    await repo.findAll({ city: 'Lagos' });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ include: { station: { select: { name: true } } } }),
    );
  });

  it('getHazardousReadings includes stationName on each result', async () => {
    const findAll = jest.fn().mockResolvedValue([
      { id: 'r1', stationId: 7, pm25: 18, pm10: null, co: null, no2: null, o3: null, so2: null, station: { name: 'Ijebu-Ode Roadside' } },
    ]);
    const module = await Test.createTestingModule({
      providers: [
        AirQualityService,
        { provide: AirQualityRepository, useValue: { findAll } },
        { provide: StationRepository, useValue: {} },
        { provide: AuditLogService, useValue: { log: jest.fn() } },
      ],
    }).compile();
    const service = module.get(AirQualityService);

    const [result] = await service.getHazardousReadings('Lagos');

    expect(result.stationName).toBe('Ijebu-Ode Roadside');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest air-quality-hazardous-station-name`
Expected: FAIL — `findAll`'s Prisma call has no `include`; `getHazardousReadings`'s result has no `stationName` key.

- [ ] **Step 3: Add the `include` to `findAll`**

```ts
// src/air-quality/air-quality.repository.ts — replace findAll's signature and body
async findAll(filter?: { city?: string; stationId?: number; since?: Date }): Promise<(AirQuality & { station: { name: string } })[]> {
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
      include: { station: { select: { name: true } } },
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

(Only the return type annotation and the added `include` line change. Every other repository method — `create`, `findById`, `delete`, `update`, `findLatestByStation`, `findByDateRange`, `aggregateByCity`, `aggregateByStation` — is untouched.)

- [ ] **Step 4: Surface `stationName` in `getHazardousReadings`**

```ts
// src/air-quality/air-quality.service.ts — getHazardousReadings, replace entirely
async getHazardousReadings(city: string, hours = 24) {
  const safeHours = Math.min(hours, AirQualityService.MAX_WINDOW_HOURS);
  const since = new Date(Date.now() - safeHours * 60 * 60 * 1000);
  try {
    const readings = await this.airQualityRepo.findAll({ city, since });
    const withExceedances = readings.map((r) => {
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
      stationName: x.reading.station.name,
      exceedances: x.exceedances,
    }));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Failed to fetch hazardous readings for city ${city}: ${msg}`);
    throw new InternalServerErrorException('Failed to fetch hazardous readings.');
  }
}
```

(The explicit `(r: AirQuality)` type annotation on the `.map` callback is removed — with `findAll`'s new richer return type, TS infers `r`'s type correctly on its own, including `.station.name`. Nothing else in the method changes: the exceedance-computation loop, the filter, and the final map's `plainToInstance` call and `exceedances` field are exactly as before.)

- [ ] **Step 5: Document `stationName` on the Swagger DTO**

```ts
// src/air-quality/dto/air-quality-response.dto.ts — HazardousReadingResponseDto, replace entirely
export class HazardousReadingResponseDto extends AirQualityReadingResponseDto {
  @ApiProperty({ description: 'Name of the station where this reading was taken', example: 'Ijebu-Ode Roadside' })
  stationName: string;

  @ApiProperty({ description: 'Pollutants that exceeded their WHO 2021 guideline value, with the exceedance factor', type: [ExceedanceDto] })
  exceedances: ExceedanceDto[];
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx jest air-quality-hazardous-station-name`
Expected: both pass.

- [ ] **Step 7: Run the full suite and build**

Run: `npm test && npm run build`
Expected: all pass, build exits 0. `findAll`'s widened return type flows into `getReadingsByStation`, `getReadingsByCity`, `findDuplicates`, and `StationService.getCompleteness` — all of them consume the array structurally without relying on it being exactly `AirQuality[]`, so none should need code changes. Confirm this by running the build, not by assuming it.

- [ ] **Step 8: Commit**

```bash
git add src/air-quality/air-quality.repository.ts src/air-quality/air-quality.service.ts \
  src/air-quality/dto/air-quality-response.dto.ts test/air-quality-hazardous-station-name.spec.ts
git commit -m "feat: include station name on hazardous/exceedance readings"
```

---

### Task 2: CSV formatting helper

**Files:**
- Create: `src/air-quality/hazardous-csv.util.ts`
- Test: `test/hazardous-csv.util.spec.ts`

**Interfaces:**
- Consumes: the array shape `getHazardousReadings` returns (Task 1) — each item has `id: number`, `stationId: number`, `stationName: string`, `measuredAt: Date | null`, `createdAt: Date`, `isSuspect: boolean`, `exceedances: { pollutant: string; value: number; limit: number; factor: number }[]`.
- Produces: `formatHazardousReadingsAsCsv(readings: HazardousReadingLike[]): string` — a complete CSV string (header + one row per exceedance), exported for the controller (Task 3) to use.

- [ ] **Step 1: Write the failing test**

```ts
// test/hazardous-csv.util.spec.ts
import { formatHazardousReadingsAsCsv } from '../src/air-quality/hazardous-csv.util.js';

describe('formatHazardousReadingsAsCsv', () => {
  it('produces one row per exceedance for a reading with multiple exceedances', () => {
    const csv = formatHazardousReadingsAsCsv([
      {
        id: 'r1', stationId: 7, stationName: 'Ijebu-Ode Roadside',
        measuredAt: new Date('2026-07-15T09:00:00.000Z'), createdAt: new Date('2026-07-15T09:05:00.000Z'),
        isSuspect: false,
        exceedances: [
          { pollutant: 'no2', value: 325, limit: 25, factor: 13 },
          { pollutant: 'pm25', value: 18, limit: 15, factor: 1.2 },
        ],
      },
    ]);

    const lines = csv.trim().split('\n');
    expect(lines).toHaveLength(3); // header + 2 exceedance rows
    expect(lines[0]).toBe('stationId,stationName,pollutant,value,limit,factor,measuredAt,isSuspect,readingId');
    expect(lines[1]).toBe('7,Ijebu-Ode Roadside,no2,325,25,13,2026-07-15T09:00:00.000Z,false,r1');
    expect(lines[2]).toBe('7,Ijebu-Ode Roadside,pm25,18,15,1.2,2026-07-15T09:00:00.000Z,false,r1');
  });

  it('falls back to createdAt when measuredAt is null', () => {
    const csv = formatHazardousReadingsAsCsv([
      {
        id: 'r2', stationId: 1, stationName: 'Lagos Central',
        measuredAt: null, createdAt: new Date('2026-08-01T12:00:00.000Z'),
        isSuspect: false,
        exceedances: [{ pollutant: 'pm10', value: 50, limit: 45, factor: 1.1 }],
      },
    ]);

    expect(csv.trim().split('\n')[1]).toContain('2026-08-01T12:00:00.000Z');
  });

  it('quotes a station name containing a comma, per RFC 4180', () => {
    const csv = formatHazardousReadingsAsCsv([
      {
        id: 'r3', stationId: 2, stationName: 'Lagos, Ikeja',
        measuredAt: new Date('2026-08-01T00:00:00.000Z'), createdAt: new Date('2026-08-01T00:00:00.000Z'),
        isSuspect: true,
        exceedances: [{ pollutant: 'co', value: 5000, limit: 4000, factor: 1.3 }],
      },
    ]);

    expect(csv.trim().split('\n')[1]).toContain('"Lagos, Ikeja"');
  });

  it('produces a header-only CSV for an empty readings array', () => {
    const csv = formatHazardousReadingsAsCsv([]);

    expect(csv.trim()).toBe('stationId,stationName,pollutant,value,limit,factor,measuredAt,isSuspect,readingId');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest hazardous-csv.util`
Expected: FAIL — the module doesn't exist.

- [ ] **Step 3: Implement the formatter**

```ts
// src/air-quality/hazardous-csv.util.ts
interface HazardousReadingLike {
  id: string | number;
  stationId: number;
  stationName: string;
  measuredAt: Date | null;
  createdAt: Date;
  isSuspect: boolean;
  exceedances: { pollutant: string; value: number; limit: number; factor: number }[];
}

const CSV_HEADER = 'stationId,stationName,pollutant,value,limit,factor,measuredAt,isSuspect,readingId';

function csvField(value: string | number | boolean): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function formatHazardousReadingsAsCsv(readings: HazardousReadingLike[]): string {
  const rows = readings.flatMap((reading) => {
    const when = (reading.measuredAt ?? reading.createdAt).toISOString();
    return reading.exceedances.map((ex) =>
      [
        reading.stationId,
        reading.stationName,
        ex.pollutant,
        ex.value,
        ex.limit,
        ex.factor,
        when,
        reading.isSuspect,
        reading.id,
      ]
        .map(csvField)
        .join(','),
    );
  });

  return [CSV_HEADER, ...rows].join('\n') + '\n';
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest hazardous-csv.util`
Expected: all 4 pass.

- [ ] **Step 5: Run the full suite and build**

Run: `npm test && npm run build`
Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/air-quality/hazardous-csv.util.ts test/hazardous-csv.util.spec.ts
git commit -m "feat: add CSV formatter for hazardous/exceedance readings"
```

---

### Task 3: Wire `?format=csv` into the hazardous route

**Files:**
- Modify: `src/air-quality/air-quality.controller.ts`
- Test: `test/air-quality-hazardous-csv-route.spec.ts`

**Interfaces:**
- Consumes: `AirQualityService.getHazardousReadings` (unchanged call), `formatHazardousReadingsAsCsv` (Task 2).
- Produces: `GET /air-quality/city/:city/hazardous?format=csv` returns `text/csv` with a `Content-Disposition: attachment` header. Any other/absent `format` value returns the existing JSON response, byte-for-byte unchanged.

- [ ] **Step 1: Write the failing test**

```ts
// test/air-quality-hazardous-csv-route.spec.ts
import { Test } from '@nestjs/testing';
import { AirQualityController } from '../src/air-quality/air-quality.controller.js';
import { AirQualityService } from '../src/air-quality/air-quality.service.js';
import { ConfigService } from '@nestjs/config';

describe('GET /air-quality/city/:city/hazardous?format=csv', () => {
  const buildController = async (hazardousResult: any[]) => {
    const getHazardousReadings = jest.fn().mockResolvedValue(hazardousResult);
    const module = await Test.createTestingModule({
      controllers: [AirQualityController],
      providers: [
        { provide: AirQualityService, useValue: { getHazardousReadings } },
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    }).compile();
    return module.get(AirQualityController);
  };

  const mockResponse = () => {
    const res: any = {};
    res.setHeader = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
  };

  it('returns CSV with the correct headers when format=csv', async () => {
    const controller = await buildController([
      {
        id: 'r1', stationId: 7, stationName: 'Ijebu-Ode Roadside',
        measuredAt: new Date('2026-07-15T09:00:00.000Z'), createdAt: new Date('2026-07-15T09:00:00.000Z'),
        isSuspect: false,
        exceedances: [{ pollutant: 'no2', value: 325, limit: 25, factor: 13 }],
      },
    ]);
    const res = mockResponse();

    await controller.hazardous('Lagos', undefined, 'csv', res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('attachment'));
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('no2,325,25,13'));
  });

  it('returns the existing JSON shape when format is absent', async () => {
    const jsonResult = [{ id: 'r1', exceedances: [] }];
    const controller = await buildController(jsonResult);
    const res = mockResponse();

    const result = await controller.hazardous('Lagos', undefined, undefined, res);

    expect(result).toBe(jsonResult);
    expect(res.setHeader).not.toHaveBeenCalled();
  });

  it('returns the existing JSON shape when format is an unrecognized value', async () => {
    const jsonResult = [{ id: 'r1', exceedances: [] }];
    const controller = await buildController(jsonResult);
    const res = mockResponse();

    const result = await controller.hazardous('Lagos', undefined, 'xml', res);

    expect(result).toBe(jsonResult);
    expect(res.setHeader).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest air-quality-hazardous-csv-route`
Expected: FAIL — `hazardous()` doesn't accept a `format`/`res` parameter yet.

- [ ] **Step 3: Update the route**

```ts
// src/air-quality/air-quality.controller.ts — add these imports
import { Res } from '@nestjs/common'; // merge into the existing @nestjs/common import
import { Response } from 'express'; // merge into the existing "import { Request } from 'express'" line -> "import { Request, Response } from 'express';"
import { formatHazardousReadingsAsCsv } from './hazardous-csv.util.js';

// replace the hazardous() route entirely
@Get('city/:city/hazardous')
@ApiOperation({ summary: 'Get hazardous readings by city over a recent window (default 24h, WHO 2021 guideline values). Add ?format=csv for a CSV download.' })
@ApiQuery({ name: 'hours', required: false, type: Number })
@ApiQuery({ name: 'format', required: false, description: 'Set to "csv" for a CSV download instead of JSON' })
@ApiResponse({ status: 200, type: [HazardousReadingResponseDto] })
async hazardous(
  @Param('city') city: string,
  @Query('hours', new ParseIntPipe({ optional: true })) hours: number | undefined,
  @Query('format') format: string | undefined,
  @Res({ passthrough: true }) res: Response,
) {
  this.logger.log(`Request to get hazardous readings for city: ${city}`);
  const readings = await this.airQualityService.getHazardousReadings(city, hours);

  if (format === 'csv') {
    const csv = formatHazardousReadingsAsCsv(readings);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="hazardous-${city}.csv"`);
    res.send(csv);
    return;
  }

  return readings;
}
```

`@Res({ passthrough: true })` keeps Nest's normal response handling active for the JSON path (the `return readings` still gets JSON-serialized as before) while still giving this handler direct `res` access for the CSV branch — this is the standard Nest pattern for a route that sometimes needs to write the response directly and sometimes doesn't, and avoids needing `res.json(...)` calls to replicate what Nest already does automatically.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest air-quality-hazardous-csv-route`
Expected: all 3 pass.

- [ ] **Step 5: Run the full suite and build**

Run: `npm test && npm run build`
Expected: all pass, build exits 0.

- [ ] **Step 6: Document the export in the README**

Add to the existing "⚠️ Hazardous reading thresholds & exceedance factors" section in `README.md` (append, don't replace the existing paragraph):

```markdown
Add `?format=csv` to download the same data as a CSV — one row per exceedance (a reading with
two exceeded pollutants produces two rows), columns `stationId, stationName, pollutant, value,
limit, factor, measuredAt, isSuspect, readingId`. Ready to open directly in Excel/Sheets or feed
into a report.
```

- [ ] **Step 7: Commit**

```bash
git add src/air-quality/air-quality.controller.ts README.md test/air-quality-hazardous-csv-route.spec.ts
git commit -m "feat: add ?format=csv to the hazardous endpoint for exceedance report export"
```

---

## Post-plan acceptance check (run once all tasks are done)

- [ ] `GET /air-quality/city/:city/hazardous` (no `format`) → unchanged JSON response, now including `stationName` per reading
- [ ] `GET /air-quality/city/:city/hazardous?format=csv` → `Content-Type: text/csv`, `Content-Disposition: attachment`, opens cleanly in a spreadsheet app
- [ ] A reading with 2 exceedances produces 2 CSV rows with matching `readingId`
- [ ] A city with no hazardous readings in the window → CSV with just the header row
- [ ] `npm run build` and `npm test` both pass
- [ ] Swagger at `/docs` shows the `format` query param and `stationName` field on the hazardous response
