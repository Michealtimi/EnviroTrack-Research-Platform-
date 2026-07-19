# EnviroTrack P0 Fix Spec Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix every P0 blocker in `ENVIROTRACK — FIX SPEC v1.0` so a stranger can clone the repo, follow the README, and have a working, safe, honest API in under 10 minutes.

**Architecture:** No new subsystems — this hardens the existing NestJS/Prisma modules (`stations`, `air-quality`, `openaq`) in place: real input validation, a header-based admin guard, a corrected OpenAQ v3 sync, honest docs/Docker, and windowed analytics queries.

**Tech Stack:** NestJS 11, Prisma 6, class-validator/class-transformer, `@nestjs/axios`, `@nestjs/schedule`, Jest (new — not currently installed).

## Global Constraints

- Node 18+, existing `.js`-extension relative imports and CommonJS `tsconfig.json` module resolution must be preserved exactly as-is in new files.
- OpenAQ sync must target **API v3** (`api.openaq.org/v3`) — v2 is retired and must be fully removed, not left as a fallback.
- Out of scope (do not build): NASA POWER, World Bank, ML prediction, frontend dashboard, JWT/user accounts, TimescaleDB migration. These stay in "Future Work" in the README.
- Public reads stay open. Local station create/submit stay open for v1. Only destructive/admin mutation routes get the API-key guard.
- This plan covers **P0 only**. P1 (soft delete, sync-history endpoint, CORS, exception filter) is a separate follow-up plan — do not pull it into these tasks.

## Audit notes (read before starting Task 1)

Two things the fix spec didn't call out that change how Task 1 and Task 7 must be built:

1. **The capability spec conflicts with the current schema.** Capability spec item 2 says all six pollutants (PM2.5, PM10, NO2, SO2, O3, CO) are optional per reading. Today, `prisma/schema.prisma`'s `AirQuality` model has `pm10 Float` and `pm25 Float` as **required**, and there is **no `so2` column at all**. Task 1 includes the migration to make `pm10`/`pm25` nullable and add `so2`.
2. **OpenAQ v3 has no single bulk "latest measurements" endpoint like v2's `/v2/latest`.** v3 exposes `/v3/locations` (which includes each location's `sensors` array, i.e. which pollutant IDs it reports) and `/v3/locations/{id}/latest` (latest reading per sensor for one location). The existing sync already loops per-station for measurements, so the shape of Task 7 stays close to today's code — but it must build a `sensorId → parameter name` map from the `/locations` response, since `/latest` only returns sensor IDs. Field names in v3 responses (`locality`, `country: {code, name}`) differ from v2 (`city` as a plain string) — the mapper must be defensive, and the implementer must confirm current field names against `docs.openaq.org/reference` before trusting the mapper against a live key, since third-party APIs drift.

Also: the "WHO 2021 guideline values" the spec wants referenced are, for PM2.5/PM10, the WHO 2021 AQG **24-hour** levels: PM2.5 = 15 µg/m³, PM10 = 45 µg/m³. The current hardcoded thresholds (`pm25 > 25`, `pm10 > 50`) are not those values — Task 5 corrects them so the README claim is actually true.

---

### Task 0: Test infrastructure

No test runner exists in this repo today (`package.json` has no `test` script, no Jest, no `@nestjs/testing`). Every later task needs one.

**Files:**
- Modify: `package.json`
- Create: `jest.config.js`
- Create: `test/smoke.spec.ts`

**Interfaces:**
- Produces: `npm test` runs Jest against `*.spec.ts` files under `test/` and `src/`.

- [ ] **Step 1: Add Jest deps and a `test` script**

```bash
yarn add -D jest ts-jest @types/jest @nestjs/testing
```

Edit `package.json` `scripts` block to add:

```json
"test": "jest"
```

- [ ] **Step 2: Create `jest.config.js`**

```js
/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
};
```

- [ ] **Step 3: Write a smoke test**

```ts
// test/smoke.spec.ts
describe('test harness', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 4: Run it**

Run: `npm test`
Expected: `1 passed`, exit code 0.

- [ ] **Step 5: Commit**

```bash
git add package.json yarn.lock jest.config.js test/smoke.spec.ts
git commit -m "chore: add Jest test infrastructure"
```

---

### Task 1: Enforce validation globally + fix the pollutant schema/DTO gap

**Files:**
- Modify: `src/main.ts`
- Modify: `src/stations/dto/create-station.dto.ts`
- Modify: `src/air-quality/dto/create-reading.dto.ts`
- Modify: `src/air-quality/air-Quality.controller.ts`
- Modify: `src/air-quality/air-quality.service.ts`
- Modify: `prisma/schema.prisma`
- Test: `test/create-station.dto.spec.ts`, `test/create-reading.dto.spec.ts`

**Interfaces:**
- Produces: `CreateAirQualityDto` now has all six pollutant fields (`pm25`, `pm10`, `co`, `no2`, `o3`, `so2`), all `@IsOptional()`. `AirQualityService.createReading(stationId, data, source?)` accepts `pm25`/`pm10` as `number | null` (was `number`).

- [ ] **Step 1: Write the failing validation tests**

```ts
// test/create-station.dto.spec.ts
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateStationDto } from '../src/stations/dto/create-station.dto.js';

describe('CreateStationDto', () => {
  it('rejects out-of-range latitude', async () => {
    const dto = plainToInstance(CreateStationDto, {
      name: 'Test', city: 'X', country: 'Y', latitude: 999, longitude: 0,
    });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'latitude')).toBe(true);
  });

  it('accepts a valid station', async () => {
    const dto = plainToInstance(CreateStationDto, {
      name: 'Test', city: 'X', country: 'Y', latitude: 51.5, longitude: -0.12,
    });
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });
});
```

```ts
// test/create-reading.dto.spec.ts
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateAirQualityDto } from '../src/air-quality/dto/create-reading.dto.js';

describe('CreateAirQualityDto', () => {
  it('accepts an empty body (every pollutant optional)', async () => {
    const dto = plainToInstance(CreateAirQualityDto, {});
    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('rejects a non-numeric pollutant value', async () => {
    const dto = plainToInstance(CreateAirQualityDto, { pm25: 'banana' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'pm25')).toBe(true);
  });

  it('rejects an implausible sensor value', async () => {
    const dto = plainToInstance(CreateAirQualityDto, { pm25: 99999 });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'pm25')).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- create-station.dto create-reading.dto`
Expected: FAIL — `latitude` has no `@Min`/`@Max`, `CreateAirQualityDto` has no `so2`/`o3` fields and `pm25`/`pm10`/`co`/`no2` are required, not optional.

- [ ] **Step 3: Add lat/lng bounds to `CreateStationDto`**

```ts
// src/stations/dto/create-station.dto.ts
import { IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

export class CreateStationDto {
  @ApiProperty({ description: 'Name of the monitoring station', example: 'London Central' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'City where the station is located', example: 'London' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'Country where the station is located', example: 'UK' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ description: 'Latitude of the station', example: 51.5074, minimum: -90, maximum: 90 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'Longitude of the station', example: -0.1278, minimum: -180, maximum: 180 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}

@Exclude()
export class StationResponseDto {
  @ApiProperty({ description: 'Unique identifier of the station', example: 1 })
  @Expose()
  id: number;

  @ApiProperty({ description: 'The source of the station data', example: 'local', enum: ['local', 'openaq'] })
  @Expose()
  source: 'local' | 'openaq';

  @ApiProperty({ description: 'Name of the monitoring station', example: 'London Central' })
  @Expose()
  name: string;

  @ApiProperty({ description: 'City where the station is located', example: 'London' })
  @Expose()
  city: string;

  @ApiProperty({ description: 'Country where the station is located', example: 'UK' })
  @Expose()
  country: string;

  @ApiProperty({ description: 'Latitude of the station', example: 51.5074 })
  @Expose()
  latitude: number;

  @ApiProperty({ description: 'Longitude of the station', example: -0.1278 })
  @Expose()
  longitude: number;

  @ApiProperty({ description: 'Timestamp when the station was created', example: '2025-09-20T14:00:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'External ID if from another source like OpenAQ', example: '12345', required: false })
  @Expose()
  externalId: string | null;
}

export class UpdateStationDto extends PartialType(CreateStationDto) {}
```

- [ ] **Step 4: Rewrite `CreateAirQualityDto` with all six optional, bounded pollutants**

```ts
// src/air-quality/dto/create-reading.dto.ts
import { IsNumber, IsOptional, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAirQualityDto {
  @ApiProperty({ description: 'Particulate matter 2.5 µg/m³', example: 15.5, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2000)
  pm25?: number;

  @ApiProperty({ description: 'Particulate matter 10 µg/m³', example: 25.0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2000)
  pm10?: number;

  @ApiProperty({ description: 'Carbon monoxide ppm', example: 1.2, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500)
  co?: number;

  @ApiProperty({ description: 'Nitrogen dioxide ppm', example: 0.8, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500)
  no2?: number;

  @ApiProperty({ description: 'Ozone ppm', example: 0.05, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500)
  o3?: number;

  @ApiProperty({ description: 'Sulfur dioxide ppm', example: 0.02, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500)
  so2?: number;
}
```

- [ ] **Step 5: Migrate the schema — nullable pm25/pm10, add so2**

```prisma
// prisma/schema.prisma — AirQuality model
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
}
```

Run: `npx prisma migrate dev --name air_quality_optional_pollutants_add_so2`

- [ ] **Step 6: Update `AirQualityService.createReading` to accept nullable pm25/pm10 and drop the DTO hack**

```ts
// src/air-quality/air-quality.service.ts — replace the createReading signature and body
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

    return plainToInstance(AirQualityReadingResponseDto, createdReading, { excludeExtraneousValues: true });
  } catch (error: unknown) {
    if (error instanceof NotFoundException) throw error;
    const msg = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Failed to create reading: ${msg}`);
    throw new InternalServerErrorException('Failed to create reading.');
  }
}
```

- [ ] **Step 7: Simplify the controller — no more `as any` hack**

```ts
// src/air-quality/air-Quality.controller.ts — replace the create() method body
async create(
  @Param('stationId', ParseIntPipe) stationId: number,
  @Body() body: CreateAirQualityDto,
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
  return this.airQualityService.createReading(stationId, readingData);
}
```

- [ ] **Step 8: Register the global ValidationPipe**

```ts
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module.js';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('EnviroTrack Research Platform')
    .setDescription('API for environmental monitoring (stations + air quality)')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}`);
  console.log(`📄 Swagger docs available on http://localhost:${port}/docs`);
}
bootstrap();
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `npm test -- create-station.dto create-reading.dto`
Expected: all pass.

- [ ] **Step 10: Commit**

```bash
git add src/main.ts src/stations/dto/create-station.dto.ts src/air-quality/dto/create-reading.dto.ts \
  src/air-quality/air-Quality.controller.ts src/air-quality/air-quality.service.ts \
  prisma/schema.prisma prisma/migrations test/create-station.dto.spec.ts test/create-reading.dto.spec.ts
git commit -m "fix: enforce global validation, bound lat/lng and pollutant ranges, add so2"
```

---

### Task 2: Pagination — a real query DTO with a clamp, not a per-field `@Query()`

Raw `@Query('page')`/`@Query('limit')` params (no DTO class) get nothing from `whitelist`/`transform` — there's no object for the pipe to validate. This introduces the DTO the pipe needs, and clamps `limit` instead of erroring (per spec: "clamp, don't error").

**Files:**
- Create: `src/stations/dto/unified-station-query.dto.ts`
- Modify: `src/stations/station.controller.ts`
- Modify: `src/stations/station.service.ts`
- Test: `test/station-service-pagination.spec.ts`

**Interfaces:**
- Produces: `UnifiedStationQueryDto { city?, country?, source?, page: number, limit: number }`. `StationService.getUnifiedStations` now clamps `limit` to 100 before calling the repository.

- [ ] **Step 1: Write the failing test**

```ts
// test/station-service-pagination.spec.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- station-service-pagination`
Expected: FAIL — `limit` is passed through unclamped (999999).

- [ ] **Step 3: Add the query DTO**

```ts
// src/stations/dto/unified-station-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UnifiedStationQueryDto {
  @ApiPropertyOptional({ example: 'London' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'UK' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ enum: ['local', 'openaq'] })
  @IsOptional()
  @IsIn(['local', 'openaq'])
  source?: 'local' | 'openaq';

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ example: 50, default: 50, description: 'Clamped server-side to 100.' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit: number = 50;
}
```

- [ ] **Step 4: Clamp in the service**

```ts
// src/stations/station.service.ts — replace getUnifiedStations
async getUnifiedStations(
  city?: string,
  country?: string,
  source?: 'local' | 'openaq',
  page = 1,
  limit = 50,
) {
  const safeLimit = Math.min(limit, 100);
  this.logger.log(
    `Fetching unified stations [city=${city}, country=${country}, source=${source}, page=${page}, limit=${safeLimit}]`,
  );
  try {
    return await this.stationRepo.findUnified(
      { city, country, source },
      { page, limit: safeLimit },
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Failed to fetch unified stations. Error: ${errorMessage}`);
    throw new InternalServerErrorException('Failed to retrieve unified stations.');
  }
}
```

- [ ] **Step 5: Wire the DTO into the controller**

```ts
// src/stations/station.controller.ts — replace the getUnifiedStations handler and its imports
import { UnifiedStationQueryDto } from './dto/unified-station-query.dto.js';
// ...
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
```

Remove the now-unused `@ApiQuery` imports/decorators for this route (the DTO's `@ApiPropertyOptional` decorators already document it in Swagger).

- [ ] **Step 6: Run test to verify it passes**

Run: `npm test -- station-service-pagination`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/stations/dto/unified-station-query.dto.ts src/stations/station.controller.ts \
  src/stations/station.service.ts test/station-service-pagination.spec.ts
git commit -m "fix: replace raw query params with a validated, clamped pagination DTO"
```

---

### Task 3: DB-level uniqueness on (name, city) — kill the check-then-create race

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/stations/station.repository.ts`
- Test: `test/station-repository-unique.spec.ts`

**Interfaces:**
- Produces: `StationRepository.create` throws `BadRequestException` (not a raw Prisma error) on a Prisma `P2002` unique-constraint violation.

- [ ] **Step 1: Write the failing test**

```ts
// test/station-repository-unique.spec.ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- station-repository-unique`
Expected: FAIL — `create` currently rethrows every error as `InternalServerErrorException`.

- [ ] **Step 3: Add the unique constraint to the schema**

```prisma
// prisma/schema.prisma — Station model, add at the end of the model body
model Station {
  id          Int          @id @default(autoincrement())
  name        String
  city        String
  country     String
  latitude    Float
  longitude   Float
  createdAt   DateTime     @default(now())
  readings    AirQuality[]
  openaqStationId String?  @unique
  source      String       @default("local")
  externalId  String?      @unique

  @@unique([name, city])
}
```

Run: `npx prisma migrate dev --name station_name_city_unique`

- [ ] **Step 4: Catch P2002 in the repository**

```ts
// src/stations/station.repository.ts — replace create()
import { Injectable, InternalServerErrorException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma, Station } from '@prisma/client';
import { UnifiedStationResponseDto } from './dto/unified-station-response.dto.js';

@Injectable()
export class StationRepository {
  private readonly logger = new Logger(StationRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: Omit<Station, 'id' | 'createdAt'>): Promise<Station> {
    this.logger.log(`Creating new station with name: ${data.name}`);
    try {
      const result = await this.prisma.station.create({ data });
      this.logger.log(`Successfully created station with ID: ${result.id}`);
      return result;
    } catch (error: unknown) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException(`A station named "${data.name}" already exists in "${data.city}".`);
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create station. Error: ${errorMessage}`);
      throw new InternalServerErrorException('Failed to create station in the database.');
    }
  }

  // ... rest of the file unchanged
}
```

(Only the `create` method and the import line change — leave every other method in the file untouched.)

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- station-repository-unique`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/stations/station.repository.ts test/station-repository-unique.spec.ts
git commit -m "fix: enforce station name+city uniqueness at the DB level"
```

---

### Task 4: ApiKeyGuard on destructive/admin routes

**Files:**
- Create: `src/common/guards/api-key.guard.ts`
- Modify: `src/app.module.ts`
- Modify: `src/stations/station.controller.ts`
- Modify: `src/stations/station.module.ts`
- Modify: `src/openaq/openaq.controller.ts`
- Modify: `src/openaq/openaq.module.ts`
- Test: `test/api-key.guard.spec.ts`

**Interfaces:**
- Produces: `ApiKeyGuard implements CanActivate`, reads `x-api-key` header, compares to `ADMIN_API_KEY` env var. `ConfigModule.forRoot({ isGlobal: true })` in `AppModule` so every module can inject `ConfigService` without re-importing `ConfigModule`.

- [ ] **Step 1: Write the failing test**

```ts
// test/api-key.guard.spec.ts
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiKeyGuard } from '../src/common/guards/api-key.guard.js';

function mockContext(headers: Record<string, string>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  } as unknown as ExecutionContext;
}

describe('ApiKeyGuard', () => {
  it('denies a request with no key', () => {
    const configService = { get: () => 'secret' } as unknown as ConfigService;
    const guard = new ApiKeyGuard(configService);
    expect(() => guard.canActivate(mockContext({}))).toThrow(UnauthorizedException);
  });

  it('denies a request with the wrong key', () => {
    const configService = { get: () => 'secret' } as unknown as ConfigService;
    const guard = new ApiKeyGuard(configService);
    expect(() => guard.canActivate(mockContext({ 'x-api-key': 'wrong' }))).toThrow(UnauthorizedException);
  });

  it('allows a request with the matching key', () => {
    const configService = { get: () => 'secret' } as unknown as ConfigService;
    const guard = new ApiKeyGuard(configService);
    expect(guard.canActivate(mockContext({ 'x-api-key': 'secret' }))).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- api-key.guard`
Expected: FAIL — module doesn't exist yet.

- [ ] **Step 3: Implement the guard**

```ts
// src/common/guards/api-key.guard.ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const providedKey = request.headers['x-api-key'];
    const expectedKey = this.configService.get<string>('ADMIN_API_KEY');

    if (!expectedKey) {
      throw new UnauthorizedException('Admin API key is not configured on the server.');
    }
    if (providedKey !== expectedKey) {
      throw new UnauthorizedException('Invalid or missing API key.');
    }
    return true;
  }
}
```

- [ ] **Step 4: Make `ConfigService` global**

```ts
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { StationModule } from './stations/station.module.js';
import { AirQualityModule } from './air-quality/air-quality.module.js';
import { OpenAQModule } from './openaq/openaq.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    StationModule,
    AirQualityModule,
    OpenAQModule,
  ],
})
export class AppModule {}
```

Remove the now-redundant bare `ConfigModule` import from `src/openaq/openaq.module.ts`'s `imports` array (it's global now).

- [ ] **Step 5: Guard the destructive station route**

```ts
// src/stations/station.controller.ts — add these imports and decorate remove()
import { UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../common/guards/api-key.guard.js';
import { ApiHeader } from '@nestjs/swagger';
// ...
@Delete(':id')
@UseGuards(ApiKeyGuard)
@ApiHeader({ name: 'x-api-key', required: true, description: 'Admin API key' })
@ApiOperation({ summary: 'Delete a station (requires admin API key)' })
async remove(@Param('id', ParseIntPipe) id: number) {
  this.logger.log(`Request to delete station with ID: ${id}`);
  return this.stationService.deleteStation(id);
}
```

Add `ApiKeyGuard` to `StationModule`'s `providers` array in `src/stations/station.module.ts`.

- [ ] **Step 6: Guard the OpenAQ mutation routes**

```ts
// src/openaq/openaq.controller.ts — add UseGuards to all three POST routes
import { Controller, Post, Body, Logger, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { ApiKeyGuard } from '../common/guards/api-key.guard.js';
import { OpenAQService } from './openaq.service.js';
import { OpenAQParameterDto } from './dto/openaq-parameter.dto.js';
import { OpenAQMeasurementDto } from './dto/openaq-measurement.dto.js';

@ApiTags('OpenAQ')
@Controller('openaq')
@UseGuards(ApiKeyGuard)
@ApiHeader({ name: 'x-api-key', required: true, description: 'Admin API key' })
export class OpenAQController {
  private readonly logger = new Logger(OpenAQController.name);

  constructor(private readonly openAQService: OpenAQService) {}

  @Post('parameters/sync')
  @ApiOperation({ summary: 'Sync OpenAQ parameters (requires admin API key)' })
  @ApiResponse({ status: 201, description: 'Parameters synced successfully.' })
  async syncParameters(@Body() params: OpenAQParameterDto[]) {
    this.logger.log(`Received request to sync ${params.length} parameters.`);
    return this.openAQService.syncParameters(params);
  }

  @Post('measurements/sync')
  @ApiOperation({ summary: 'Sync OpenAQ measurements (requires admin API key)' })
  @ApiResponse({ status: 201, description: 'Measurements synced successfully.' })
  async syncMeasurements(@Body() measurements: OpenAQMeasurementDto[]) {
    this.logger.log(`Received request to sync ${measurements.length} measurements.`);
    return this.openAQService.syncMeasurements(measurements);
  }

  @Post('full-sync')
  @ApiOperation({ summary: 'Full sync: parameters + measurements (requires admin API key)' })
  @ApiResponse({ status: 201, description: 'Full OpenAQ sync completed.' })
  async fullSync(
    @Body() data: { parameters: OpenAQParameterDto[]; measurements: OpenAQMeasurementDto[] },
  ) {
    this.logger.log(`Received request for full OpenAQ sync.`);
    return this.openAQService.fullOpenAQSync(data);
  }
}
```

Add `ApiKeyGuard` to `OpenAQModule`'s `providers` array in `src/openaq/openaq.module.ts`.

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test -- api-key.guard`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/common/guards/api-key.guard.ts src/app.module.ts src/stations/station.controller.ts \
  src/stations/station.module.ts src/openaq/openaq.controller.ts src/openaq/openaq.module.ts \
  test/api-key.guard.spec.ts
git commit -m "feat: guard destructive and OpenAQ-mutation routes with an admin API key"
```

---

### Task 5: Windowed analytics + correct WHO 2021 thresholds

**Files:**
- Modify: `src/air-quality/air-Quality.repository.ts`
- Modify: `src/air-quality/air-quality.service.ts`
- Modify: `src/air-quality/air-Quality.controller.ts`
- Test: `test/air-quality-windowed.spec.ts`

**Interfaces:**
- Produces: `AirQualityRepository.aggregateByCity(city, sinceDate)` and `findAll` accept an optional `since: Date` filter. `AirQualityService.getAveragePollutionByCity(city, hours = 24)` returns `{ city, windowHours, average, sampleCount }`. Hazardous threshold: `pm25 !== null && pm25 > 15` or `pm10 !== null && pm10 > 45` (WHO 2021 24-hour guideline levels).

- [ ] **Step 1: Write the failing test**

```ts
// test/air-quality-windowed.spec.ts
import { Test } from '@nestjs/testing';
import { AirQualityService } from '../src/air-quality/air-quality.service.js';
import { AirQualityRepository } from '../src/air-quality/air-Quality.repository.js';
import { StationRepository } from '../src/stations/station.repository.js';

describe('AirQualityService time-windowed analytics', () => {
  it('passes a 24h-ago cutoff by default to the repository', async () => {
    const aggregateByCity = jest.fn().mockResolvedValue({ _avg: { pm25: 10 }, _count: 5 });
    const module = await Test.createTestingModule({
      providers: [
        AirQualityService,
        { provide: AirQualityRepository, useValue: { aggregateByCity } },
        { provide: StationRepository, useValue: {} },
      ],
    }).compile();

    const service = module.get(AirQualityService);
    const before = Date.now();
    const result = await service.getAveragePollutionByCity('Lagos');
    const since: Date = aggregateByCity.mock.calls[0][1];

    expect(before - since.getTime()).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000 - 1000);
    expect(result).toEqual(expect.objectContaining({ city: 'Lagos', windowHours: 24, sampleCount: 5 }));
  });

  it('flags pm25 > 15 as hazardous (WHO 2021 24h guideline) and skips null readings', async () => {
    const findAll = jest.fn().mockResolvedValue([
      { pm25: 16, pm10: null },
      { pm25: 10, pm10: null },
      { pm25: null, pm10: null },
    ]);
    const module = await Test.createTestingModule({
      providers: [
        AirQualityService,
        { provide: AirQualityRepository, useValue: { findAll } },
        { provide: StationRepository, useValue: {} },
      ],
    }).compile();

    const service = module.get(AirQualityService);
    const result = await service.getHazardousReadings('Lagos');
    expect(result.length).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- air-quality-windowed`
Expected: FAIL — current methods take no `since`/`hours` argument, and hazardous still uses `r.pm25 > 25` (also crashes on `null` since the type was `number` before Task 1).

- [ ] **Step 3: Add windowing to the repository**

```ts
// src/air-quality/air-Quality.repository.ts — replace aggregateByCity and findAll
async findAll(filter?: { city?: string; stationId?: number; since?: Date }): Promise<AirQuality[]> {
  this.logger.log(`Fetching all readings with filter: ${JSON.stringify(filter)}`);
  try {
    const result = await this.prisma.airQuality.findMany({
      where: {
        ...(filter?.city && { station: { city: filter.city } }),
        ...(filter?.stationId && { stationId: filter.stationId }),
        ...(filter?.since && { createdAt: { gte: filter.since } }),
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

async aggregateByCity(city: string, since: Date) {
  this.logger.log(`Aggregating air quality for city: ${city} since ${since.toISOString()}`);
  try {
    const result = await this.prisma.airQuality.aggregate({
      where: { station: { city }, createdAt: { gte: since } },
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

(Leave `create`, `findById`, `delete`, `findLatestByStation`, `findByDateRange`, `aggregateByStation` untouched.)

- [ ] **Step 4: Add windowing + WHO thresholds to the service**

```ts
// src/air-quality/air-quality.service.ts — replace getAveragePollutionByCity and getHazardousReadings
private static readonly MAX_WINDOW_HOURS = 720;
private static readonly WHO_24H_PM25_UGM3 = 15;
private static readonly WHO_24H_PM10_UGM3 = 45;

async getAveragePollutionByCity(city: string, hours = 24) {
  const safeHours = Math.min(hours, AirQualityService.MAX_WINDOW_HOURS);
  const since = new Date(Date.now() - safeHours * 60 * 60 * 1000);
  try {
    const result = await this.airQualityRepo.aggregateByCity(city, since);
    return {
      city,
      windowHours: safeHours,
      average: result._avg,
      sampleCount: result._count,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Failed to calculate averages for city ${city}: ${msg}`);
    throw new InternalServerErrorException('Failed to calculate averages.');
  }
}

async getHazardousReadings(city: string, hours = 24) {
  const safeHours = Math.min(hours, AirQualityService.MAX_WINDOW_HOURS);
  const since = new Date(Date.now() - safeHours * 60 * 60 * 1000);
  try {
    const readings = await this.airQualityRepo.findAll({ city, since });
    const hazardous = readings.filter(
      (r: AirQuality) =>
        (r.pm25 !== null && r.pm25 > AirQualityService.WHO_24H_PM25_UGM3) ||
        (r.pm10 !== null && r.pm10 > AirQualityService.WHO_24H_PM10_UGM3),
    );
    return plainToInstance(AirQualityReadingResponseDto, hazardous, { excludeExtraneousValues: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Failed to fetch hazardous readings for city ${city}: ${msg}`);
    throw new InternalServerErrorException('Failed to fetch hazardous readings.');
  }
}
```

- [ ] **Step 5: Add an `hours` query param on both routes**

```ts
// src/air-Quality.controller.ts — replace averageByCity and hazardous
import { Query } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
// ...
@Get('city/:city/average')
@ApiOperation({ summary: 'Get average pollution by city over a recent window (default 24h)' })
@ApiQuery({ name: 'hours', required: false, type: Number })
async averageByCity(@Param('city') city: string, @Query('hours') hours?: number) {
  this.logger.log(`Request to get average pollution for city: ${city}`);
  return this.airQualityService.getAveragePollutionByCity(city, hours ? Number(hours) : undefined);
}

@Get('city/:city/hazardous')
@ApiOperation({ summary: 'Get hazardous readings by city over a recent window (default 24h, WHO 2021 24h guideline)' })
@ApiQuery({ name: 'hours', required: false, type: Number })
async hazardous(@Param('city') city: string, @Query('hours') hours?: number) {
  this.logger.log(`Request to get hazardous readings for city: ${city}`);
  return this.airQualityService.getHazardousReadings(city, hours ? Number(hours) : undefined);
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- air-quality-windowed`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/air-quality/air-Quality.repository.ts src/air-quality/air-quality.service.ts \
  src/air-quality/air-Quality.controller.ts test/air-quality-windowed.spec.ts
git commit -m "fix: window average/hazardous queries to a recent period, use WHO 2021 24h thresholds"
```

---

### Task 6: Delete dead code — one OpenAQ sync path, no empty files

**Files:**
- Delete: `src/air-quality/openaq-sync.service.ts`
- Delete: `src/openaq/openaq.repository.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — this is pure removal. `openaq.repository.ts` is empty and unreferenced (`OpenAQService` talks to `PrismaService` directly); recreating a repository layer for two straightforward upserts isn't worth it for v1. `air-quality/openaq-sync.service.ts` was never registered in any module's `providers` array — confirm that before deleting.

- [ ] **Step 1: Confirm both files are actually unreferenced**

Run: `grep -rn "openaq-sync.service" src --include=*.ts | grep -v "src/openaq/openaq-sync.service.ts"`
Expected: no output (nothing imports the `air-quality` copy).

Run: `grep -rn "openaq.repository" src --include=*.ts`
Expected: no output (nothing imports it — it's dead).

- [ ] **Step 2: Delete the files**

```bash
git rm src/air-quality/openaq-sync.service.ts src/openaq/openaq.repository.ts
```

- [ ] **Step 3: Verify the build still succeeds**

Run: `npm run build`
Expected: exit code 0, no missing-module errors.

- [ ] **Step 4: Commit**

```bash
git commit -m "chore: remove dead OpenAQ sync duplicate and empty repository file"
```

---

### Task 7: Migrate the live OpenAQ sync to API v3

**Files:**
- Modify: `src/openaq/openaq-sync.service.ts`
- Test: `test/openaq-sync-v3.spec.ts`

**Interfaces:**
- Consumes: `StationService.upsertFromOpenAQ`, `StationService.getAllStations`, `AirQualityService.createReading` (unchanged signatures from Task 1).
- Produces: sync now hits `https://api.openaq.org/v3`, caps itself to `OPENAQ_SYNC_MAX_LOCATIONS` (env, default 50) locations per run, optionally scoped to `OPENAQ_SYNC_COUNTRY_ISO` (env, optional).

- [ ] **Step 1: Write the failing test**

```ts
// test/openaq-sync-v3.spec.ts
import { Test } from '@nestjs/testing';
import { of } from 'rxjs';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { OpenAQSyncService } from '../src/openaq/openaq-sync.service.js';
import { StationService } from '../src/stations/station.service.js';
import { AirQualityService } from '../src/air-quality/air-quality.service.js';

describe('OpenAQSyncService v3', () => {
  it('caps station sync at OPENAQ_SYNC_MAX_LOCATIONS and calls the v3 endpoint', async () => {
    const upsertFromOpenAQ = jest.fn().mockResolvedValue({});
    const httpGet = jest.fn().mockReturnValue(
      of({
        data: {
          results: Array.from({ length: 100 }, (_, i) => ({
            id: i,
            name: `Station ${i}`,
            country: { name: 'UK' },
            coordinates: { latitude: 1, longitude: 1 },
            sensors: [],
          })),
        },
      }),
    );

    const module = await Test.createTestingModule({
      providers: [
        OpenAQSyncService,
        { provide: StationService, useValue: { upsertFromOpenAQ, getAllStations: jest.fn().mockResolvedValue([]) } },
        { provide: AirQualityService, useValue: { createReading: jest.fn() } },
        {
          provide: ConfigService,
          useValue: { get: (key: string) => (key === 'OPENAQ_SYNC_MAX_LOCATIONS' ? '10' : undefined) },
        },
        { provide: HttpService, useValue: { get: httpGet } },
      ],
    }).compile();

    const service = module.get(OpenAQSyncService);
    await (service as any).syncStations();

    expect(upsertFromOpenAQ).toHaveBeenCalledTimes(10);
    expect(httpGet).toHaveBeenCalledWith(
      'https://api.openaq.org/v3/locations',
      expect.objectContaining({ headers: expect.objectContaining({ 'X-API-Key': expect.anything() }) }),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- openaq-sync-v3`
Expected: FAIL — the service still targets `v2` and has no `maxLocations` cap.

- [ ] **Step 3: Rewrite the sync service**

```ts
// src/openaq/openaq-sync.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';
import { StationService } from '../stations/station.service.js';
import { AirQualityService } from '../air-quality/air-quality.service.js';

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
  ) {
    this.apiKey = this.configService.get<string>('OPENAQ_API_KEY') as string;
    this.maxLocations = Number(this.configService.get<string>('OPENAQ_SYNC_MAX_LOCATIONS')) || 50;
    this.countryIso = this.configService.get<string>('OPENAQ_SYNC_COUNTRY_ISO') || undefined;
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
    this.logger.log('📡 Syncing OpenAQ locations (v3)...');
    const sensorParameterMap = new Map<number, string>();
    let page = 1;
    let synced = 0;

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
          this.logger.error(`Failed to sync location ${loc.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      }

      page++;
    }

    this.logger.log(`✅ Synced ${synced} OpenAQ locations.`);
    return sensorParameterMap;
  }

  private async syncLatestMeasurements(sensorParameterMap: Map<number, string>) {
    this.logger.log('📊 Syncing latest OpenAQ measurements (v3)...');
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
        for (const r of results) {
          const paramName = sensorParameterMap.get(r.sensorsId);
          if (paramName && paramName in reading) {
            reading[paramName] = r.value;
          }
        }
        await this.airQualityService.createReading(
          station.id,
          reading as { pm25: number | null; pm10: number | null; co: number | null; no2: number | null; o3: number | null; so2: number | null },
          'openaq',
        );
      } catch (err: unknown) {
        this.logger.error(`Failed to sync measurements for station ${station.name} (${station.externalId}): ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    this.logger.log('✅ Measurements sync process completed.');
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- openaq-sync-v3`
Expected: PASS.

- [ ] **Step 5: Manual verification against the live API (not automated — requires a real key)**

Before trusting this against production data: sign up for a free key at explore.openaq.org, then run:

```bash
curl -H "X-API-Key: $OPENAQ_API_KEY" "https://api.openaq.org/v3/locations?limit=1"
```

Confirm the response actually has `results[0].{id,name,locality,country,coordinates,sensors}` in the shapes this code assumes — OpenAQ's schema has drifted before and may drift again; adjust the mapper in Step 3 if field names differ from what's above.

- [ ] **Step 6: Commit**

```bash
git add src/openaq/openaq-sync.service.ts test/openaq-sync-v3.spec.ts
git commit -m "fix: migrate OpenAQ sync from retired v2 API to v3, cap sync scope for v1"
```

---

### Task 8: Honest Docker + env config

**Files:**
- Create: `Dockerfile`
- Create: `docker-compose.yml`
- Create: `.env.example`
- Modify: `.gitignore` (ensure `.env` is ignored, not `.env.example`)

**Interfaces:**
- Produces: `docker compose up -d --build` brings up Postgres + the app from a clean clone once `.env` is filled in from `.env.example`.

- [ ] **Step 1: Create `.env.example`**

```bash
# .env.example
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/envirotrack?schema=public"

# Get a free key at https://explore.openaq.org
OPENAQ_API_KEY="your-openaq-v3-key"

# Any random string — required to call DELETE /stations/:id and the /openaq/*/sync routes
ADMIN_API_KEY="change-me-to-a-random-string"

# Optional: scope the hourly OpenAQ sync for v1 (see src/openaq/openaq-sync.service.ts)
OPENAQ_SYNC_COUNTRY_ISO=""
OPENAQ_SYNC_MAX_LOCATIONS="50"

PORT="3000"
```

- [ ] **Step 2: Create `Dockerfile`**

```dockerfile
FROM node:20-alpine
WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn prisma:generate && yarn build

EXPOSE 3000
CMD ["node", "dist/main.js"]
```

- [ ] **Step 3: Create `docker-compose.yml`**

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: envirotrack
    ports:
      - "5432:5432"
    volumes:
      - envirotrack_pgdata:/var/lib/postgresql/data

  app:
    build: .
    restart: unless-stopped
    depends_on:
      - postgres
    env_file:
      - .env
    ports:
      - "3000:3000"

volumes:
  envirotrack_pgdata:
```

- [ ] **Step 4: Confirm `.gitignore` covers `.env`**

Check `.gitignore` contains a line for `.env` (not `.env.example`). Add it if missing:

```
.env
```

- [ ] **Step 5: Manual verification (not automated — requires Docker)**

```bash
cp .env.example .env
docker compose up -d --build
curl http://localhost:3000/docs
```

Expected: Swagger UI HTML response. Then `docker compose exec app npx prisma migrate deploy` to apply migrations against the containerized Postgres.

- [ ] **Step 6: Commit**

```bash
git add Dockerfile docker-compose.yml .env.example .gitignore
git commit -m "feat: add Docker Compose deployment and a real .env.example"
```

---

### Task 9: Rewrite the README to match reality

**Files:**
- Modify: `README.md`

**Interfaces:**
- Produces: a README a stranger can follow literally and succeed, per the spec's Definition of Done.

- [ ] **Step 1: Update the Features section**

Remove NASA POWER / World Bank from the bulleted "Features" list (keep only in "Future Work" — they're not implemented). Add a line noting the admin API key requirement for destructive/OpenAQ-mutation routes.

- [ ] **Step 2: Fix the Getting Started steps**

Replace step 3/4 with:

```markdown
3. **Set up the database and app with Docker:**

   ```bash
   cp .env.example .env
   # edit .env: set OPENAQ_API_KEY and ADMIN_API_KEY
   docker compose up -d --build
   docker compose exec app npx prisma migrate deploy
   ```

   The application will be running on `http://localhost:3000`, Swagger docs at `http://localhost:3000/docs`.
```

- [ ] **Step 3: Document the admin API key**

Add a subsection under "API Usage":

```markdown
### 🔐 Protected routes

`DELETE /stations/:id` and the `/openaq/*/sync` routes require an `x-api-key` header
matching the `ADMIN_API_KEY` environment variable. All read routes and local station
create/submit routes are open in v1.
```

- [ ] **Step 4: Document the hazardous thresholds**

Add a subsection under "API Usage":

```markdown
### ⚠️ Hazardous reading thresholds

`GET /air-quality/city/:city/hazardous` flags a reading as hazardous when PM2.5 exceeds
15 µg/m³ or PM10 exceeds 45 µg/m³ over the requested window (default 24h) — the WHO 2021
Air Quality Guidelines' 24-hour levels for these pollutants.
```

- [ ] **Step 5: Fix or remove the testing claim**

Replace "Comprehensive Testing" bullet with: "Automated tests: `npm test` (Jest) covers DTO validation, pagination clamping, the admin API-key guard, and the OpenAQ v3 sync mapper."

- [ ] **Step 6: Commit**

```bash
git add README.md
git commit -m "docs: make the README match what the codebase actually does"
```

---

## Post-plan acceptance check (run once all tasks are done)

- [ ] Clean clone → `cp .env.example .env` → fill 3 vars → `docker compose up -d --build` → API live
- [ ] `POST /air-quality/station/:id` with `{"pm25": "banana"}` → 400, not a Prisma crash
- [ ] `DELETE /stations/:id` without `x-api-key` → 401
- [ ] `GET /stations/unified?limit=999999` → returns at most 100 rows
- [ ] `GET /air-quality/city/Lagos/average` → response includes `windowHours` and `sampleCount`
- [ ] `git grep -rn "v2" src` and `git grep -rn "openaq.org" src` → only `v3` references remain
- [ ] `npm run build` and `npm test` both pass
- [ ] Swagger at `/docs` matches every actual request/response shape
