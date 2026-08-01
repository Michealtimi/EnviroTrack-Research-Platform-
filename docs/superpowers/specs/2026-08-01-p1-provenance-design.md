# P1: Provenance, Soft Delete, Sync History, Exceedance Factors — Design

## Context

P0 (merged) made the existing API surface honest and safe: validation, auth, correct WHO thresholds, a working OpenAQ v3 sync. It deliberately left out anything that changes what data the platform *keeps a record of* — that's P1. Four gaps, identified in the original persona audit:

- **Auditor**: `AuditLog` model exists in the schema; nothing writes to it.
- **Data steward**: `deleteStation` is a real hard delete, cascading to permanently erase every reading for that station.
- **System operator**: `OpenAQSyncLog` model exists; nothing writes to it, and there's no way to see if the hourly cron is silently failing.
- **Policy analyst**: `/hazardous` returns a boolean list, not "NO2 is 13x the WHO limit."

## Decisions (from brainstorming)

- **Audit identity**: no user-account system exists. Log `userId` as the literal string `"admin"` for requests that passed `ApiKeyGuard`, `"public"` otherwise.
- **Audit scope**: station update, station delete (soft-delete), and **locally-submitted** reading creation (`source: 'local'` only). Not OpenAQ station upserts or OpenAQ-synced readings — both are high-volume and non-destructive, and already covered in aggregate by sync history below. Logging every synced reading individually would flood `AuditLog` with entries the auditor persona doesn't actually need (nobody disputes what the cron did — sync history's counts already answer that).
- **Soft delete**: `deletedAt DateTime?` on `Station` only. `deleteStation` sets `deletedAt`, never calls `prisma.station.delete`, and — critically — **stops the existing cascade that hard-deletes all of a station's `AirQuality` rows**. Readings are immutable/create-only already; this is the one change needed to make "never destroy research data" true.
- **Deleted visibility**: a soft-deleted station 404s everywhere — direct `GET /stations/:id`, `findAll`, `findByCity`, `findUnified` all filter `deletedAt: null`. The row and its audit trail remain in Postgres for a DB admin, just not through the API.
- **Sync log granularity**: one `OpenAQSyncLog` row per phase per run (`resource: 'stations'` and `resource: 'measurements'` separately), so a partial failure (stations ok, measurements failed) is visible without opening `details`.
- **Exceedance factors**: extend the existing `/air-quality/city/:city/hazardous` response — don't add a new endpoint. Cover all six pollutants, not just PM2.5/PM10.
- **Units**: `co`/`no2`/`o3`/`so2` are treated as µg/m³ (CO's WHO value converted from 4 mg/m³ to 4000 µg/m³ so all six columns share one unit). The existing Swagger descriptions calling these "ppm" were never a deliberate choice — copy-paste from the original scaffold — and get corrected as part of this work.

## WHO 2021 AQG values used (guideline values, not "interim targets")

| Pollutant | Threshold | WHO averaging period (as published) |
|---|---|---|
| PM2.5 | 15 µg/m³ | 24-hour (already in code, Task 5) |
| PM10 | 45 µg/m³ | 24-hour (already in code, Task 5) |
| NO2 | 25 µg/m³ | 24-hour |
| SO2 | 40 µg/m³ | 24-hour |
| O3 | 100 µg/m³ | 8-hour (peak season guideline is 60 µg/m³ seasonal average — not usable against a rolling window, so the 8-hour value is the one applied here) |
| CO | 4000 µg/m³ | 24-hour |

Same known simplification the existing PM2.5/PM10 check already makes: the endpoint compares against a caller-supplied rolling window (default 24h), not WHO's exact calendar-period definition. Worth a one-line doc note, not a blocker — it's the same approximation already shipped and accepted in Task 5.

## Components

**`AuditLogService`** (new, `src/common/audit/audit-log.service.ts`)
- One method: `log(params: { userId: string; action: string; resource: string; resourceId: string; changes: object }): Promise<void>`.
- Wraps a `prisma.auditLog.create`. Swallows/logs its own errors — an audit-log write failure must never block the actual mutation it's describing.
- Called from `StationService.updateStation` (action: `"update"`), `StationService.deleteStation` (action: `"soft_delete"`), and `AirQualityService.createReading` **only when `source === 'local'`** (action: `"create"`) — the OpenAQ sync path (`source: 'openaq'`) is intentionally excluded, see Decisions.

**`Station.deletedAt`** (schema + migration)
- `StationRepository.delete` → rename intent to soft: sets `deletedAt: new Date()`, returns the updated row. Drop the transaction that also deletes `AirQuality` rows.
- Every station-read method in `StationRepository` (`findAll`, `findById`, `findByCity`, `findUnified`, `findFirst`) adds `deletedAt: null` to its `where`.

**`OpenAQSyncLog` writes** (`OpenAQSyncService`)
- `syncStations()` and `syncLatestMeasurements()` each wrap their existing try/catch to also write a log row on both the success and failure path: `{ resource, status, details: { synced, failed, durationMs } }`.
- New `GET /openaq/sync-history?limit=` route on `OpenAQController`, clamped to 100 like `/stations/unified`, ordered `createdAt desc`. Public read (no admin key needed — this is operational visibility, not a mutation).

**Exceedance factors** (`AirQualityService.getHazardousReadings`)
- A `WHO_LIMITS` map (the six values above).
- For each reading, compute `exceedances: { pollutant, value, limit, factor }[]` for every pollutant whose value exceeds its limit (`factor = value / limit`, rounded to 1 decimal).
- A reading counts as "hazardous" (included in the response) if `exceedances.length > 0` — replacing today's `pm25 > 25 || pm10 > 50` check.
- Response DTO gains the `exceedances` array; existing fields unchanged.

## Data flow

Station update/delete and reading creation each gain one extra `await` to `AuditLogService.log(...)` after the DB write succeeds (not before — never audit-log something that didn't happen). OpenAQ sync gains one `OpenAQSyncLog` write per phase, in both the success branch and the existing catch block. None of this changes any existing response shape except `/hazardous`.

## Error handling

- Audit-log and sync-log writes are best-effort: caught and logged via `Logger.error`, never thrown — a logging failure must not fail the request/cron it's describing.
- Soft-delete on an already-deleted or nonexistent station: `StationService` checks `deletedAt: null` before updating; not found → the existing `NotFoundException` path, unchanged.

## Testing

- `AuditLogService.log` writes are tested via a mocked `PrismaService`, verifying the correct `action`/`resource`/`userId` string per call site, and that `createReading` audits when `source: 'local'` but not when `source: 'openaq'`.
- Soft delete: a repository test confirms `delete()` calls `prisma.station.update` (not `.delete`), and that `findAll`/`findById` exclude `deletedAt`-set rows.
- Sync history: a service test confirms one log row per phase, both on success and on a forced HTTP failure.
- Exceedance: table-driven test over all six pollutants confirming `factor` math and that a reading under every limit produces an empty `exceedances` array (and is excluded from the hazardous list).

## Out of scope (explicitly, per P0's own precedent)

CSV bulk upload, offline capture, instrument/calibration/weather metadata, duplicate detection, completeness stats, data licensing/exports. These remain P2+.
