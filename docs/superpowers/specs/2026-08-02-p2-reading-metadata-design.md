# P2: Reading Metadata, Suspect-Flag, Duplicate Detection, Completeness — Design

## Context

P0 (merged) made the API honest and safe. P1 (merged) gave it provenance: audit log, soft delete, sync history, exceedance factors. P2 is the last gap identified for the field-researcher and data-steward personas in the original audit:

- **Field researcher**: "Your thesis recorded temperature and humidity alongside every reading; the platform doesn't have anywhere to put them." No fields for instrument model, calibration date, sampling duration, or weather conditions either.
- **Data steward / QA**: "Needs flagging of outliers, completeness stats, duplicate detection, and the ability to mark a reading as suspect without deleting it."

P3 (CSV bulk upload, offline capture) and P4 (exports, licensing) both want these fields/flags to exist first, which is why P2 goes now.

## Decisions (from brainstorming)

- **Metadata scope**: all six fields (instrument model, calibration date, sampling duration, weather, temperature, humidity) live on `AirQuality`, per-reading — not on `Station`. A station's instrument can change over its lifetime; per-station metadata would make old readings lie about how they were actually taken.
- **Nullability**: all six are optional. OpenAQ-synced readings will never populate them; older local readings predate their existence.
- **Weather shape**: free-text string (e.g. `"Sunny, light wind, 28°C"`), not a structured enum — matches how field notes are actually taken, and temperature/humidity are already separate numeric fields, so weather doesn't need to also be structured.
- **Suspect-flag shape**: `isSuspect: boolean` (default `false`) + `suspectReason: string | null`, not a fuller status enum. Solves exactly what was asked without inventing status values nobody requested.
- **Suspect-flag is a deliberate action, not a submission field**: `isSuspect`/`suspectReason` are NOT part of `CreateAirQualityDto` — only settable via the dedicated `PATCH` endpoint below. A submitter can never self-report their own reading as suspect (or not-suspect); only a steward action does.
- **Suspect-flag endpoint is admin-gated**, same reasoning as `DELETE /stations/:id` in P0: a mutation with judgment consequences, not a public write.
- **Duplicate detection**: a `GET` endpoint that surfaces candidate groups for human review — never auto-flags. Matches the append-only philosophy already established by sync-history and the audit log (P1): these are visibility tools, the human decides what to do with what they see.
- **Duplicate definition**: readings sharing the same `stationId` and identical values across all six pollutants, with `createdAt` within 60 seconds of each other. This models "researcher/script accidentally double-submitted," not "two genuinely close but distinct measurements."
- **Completeness scope**: `source: 'openaq'` stations only, since hourly is a real, known cadence there (the cron). Local stations have no fixed expected interval — a researcher visits Ijebu-Ode whenever they visit — so completeness against an invented cadence would be misleading. Requesting it for a local station returns `applicable: false`, not an error and not a fabricated percentage.

## Components

**Schema** (`prisma/schema.prisma`, `AirQuality` model):
```prisma
instrumentModel           String?
calibrationDate           DateTime?
samplingDurationMinutes   Int?
weatherConditions         String?
temperature               Float?
humidity                  Float?
isSuspect                 Boolean   @default(false)
suspectReason             String?
```

**`CreateAirQualityDto`**: gains six new optional fields (instrument model, calibration date, sampling duration, weather, temperature, humidity), each validated the same way existing optional pollutant fields are (`@IsOptional()` + type-appropriate validator). No `isSuspect`/`suspectReason` fields — deliberately absent.

**`AirQualityReadingResponseDto`**: exposes all eight new fields (six metadata + `isSuspect` + `suspectReason`).

**`PATCH /air-quality/:id/suspect`** (new route on `AirQualityController`, `@UseGuards(ApiKeyGuard)`): body `{ isSuspect: boolean, suspectReason?: string }`. `AirQualityService.setSuspectFlag(id, isSuspect, suspectReason, userId)` — updates the row, writes an `AuditLogService.log(...)` entry (`action: 'flag_suspect'`, `resource: 'AirQuality'`), reuses the existing `userId: 'admin'` pattern (route is guarded, so always `'admin'`, same as `StationController.remove`).

**`GET /air-quality/city/:city/duplicates`** (new, public read): `AirQualityService.findDuplicates(city)` — fetches all readings for the city, groups by `(stationId, pm25, pm10, co, no2, o3, so2)` (null-safe equality), filters groups with 2+ members whose `createdAt` values all fall within a 60-second span, returns the candidate groups.

**`GET /stations/:id/completeness?hours=`** (new, on `StationController`, public read): `StationService.getCompleteness(id, hours = 24)` — clamped to the existing `MAX_WINDOW_HOURS` (720) pattern from `AirQualityService`. For a `source: 'local'` station returns `{ applicable: false, station: ... }`. For `source: 'openaq'`, counts distinct hours (truncated `createdAt`) with at least one reading in the window, returns `{ applicable: true, windowHours, hoursWithReadings, completenessPercent }`.

## Data flow

`createReading` takes the six metadata fields as part of the same loose `data` object it already accepts pollutants through — no new parameter, no new code path, they're just additional keys passed to `airQualityRepo.create`. The suspect-flag endpoint is a single `AirQuality.update` plus one audit-log call, mirroring `StationService.updateStation`'s existing shape exactly. Duplicates and completeness are both pure read/aggregation — no writes, no interaction with any other P2 piece.

## Error handling

- `PATCH /air-quality/:id/suspect` on a nonexistent reading → `NotFoundException` (404), same pattern as every other not-found path in this codebase.
- `GET .../completeness` on a local station → `200` with `applicable: false` — not an error, since the station itself is valid.
- `GET .../duplicates` with no candidates → `200 []` — not an error, absence of duplicates is a normal, good outcome.

## Testing

- Metadata fields: a reading created with all six populated round-trips unchanged through `createReading` → response DTO.
- Suspect-flag: `setSuspectFlag` updates the row and calls `auditLog.log` with `action: 'flag_suspect'`; 404 on missing reading.
- Duplicates: two readings with identical pollutant values 10 seconds apart on the same station → grouped; same values 5 minutes apart → not grouped (outside the 60s window); different pollutant values seconds apart → not grouped.
- Completeness: an OpenAQ station with readings in 20 of the last 24 distinct hours → `83.3%` (rounded to 1 decimal, same convention as the exceedance `factor`); a local station → `applicable: false` regardless of its reading history.

## Out of scope (P3/P4, not this plan)

CSV bulk upload, offline capture, instrument/calibration metadata *import* via CSV (P2 only adds the fields and the single-reading write path), data licensing, PDF/CSV exports.
