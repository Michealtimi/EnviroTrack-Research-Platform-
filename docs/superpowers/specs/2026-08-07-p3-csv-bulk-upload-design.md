# P3: CSV Bulk Upload / Offline Capture — Design

## Context

P0-P2 (all merged) made the API honest, provenanced, and metadata-rich. P3 is the field researcher's most-felt pain point from the original audit: "needs bulk upload (CSV), not one POST per reading" and "offline capture — no signal at a roadside in Ijebu-Ode."

This repo is backend-only — there's no mobile/offline-first client app. Reframed for what a backend can actually own: a researcher captures readings in the field with no signal (on paper, in a notes app, however), then uploads one CSV once they're back online. The backend's job is to accept that batch correctly, with each reading dated to when it actually happened, not when the upload happened.

## Decisions (from brainstorming)

- **Offline capture = CSV bulk upload with per-row measurement timestamps.** No separate "offline mode" concept — the entire offline story is served by one mechanism.
- **New `measuredAt DateTime?` field**, not overloading `createdAt`. `createdAt` keeps its exact current meaning (server receipt time, `@default(now())`, used for audit/freshness ordering) with zero ripple to that semantics. `measuredAt` is the client-supplied "when this was actually measured" — set on every bulk-uploaded row, left null on regular single-POST readings (unchanged behavior there).
- **All four P2 time-windowed queries switch to `COALESCE(measuredAt, createdAt)`**: `getAveragePollutionByCity`, `getHazardousReadings`, `findDuplicates`, `getCompleteness`. Without this, a week of field readings uploaded at once would all appear to have happened in the same instant — exactly the bug this feature exists to prevent.
- **`findDuplicates`'s 60-second span check also switches to `measuredAt` (falling back to `createdAt`)**, not just its `since` window filter. This was caught in self-review: without it, re-uploading the same CSV hours or days later would produce rows with identical `measuredAt` but wildly different `createdAt` (upload time), so the existing span check — which today compares raw `createdAt` — would silently fail to group them as duplicates despite being genuinely duplicate data. Both the filter and the grouping logic need to agree on which timestamp represents "when this happened."
- **Station identification: `stationId` column**, not name/city matching. Unambiguous, no per-row lookup failures from typos or renamed stations. Researchers pull the ID list once from `GET /stations` and reuse it.
- **Partial success, not atomic.** Valid rows are inserted; invalid ones are skipped and reported with their row number and reason. A single typo in a 200-row upload from a multi-week trip must not cost the other 199 readings.
- **Same auth level as single-reading POST: public, no admin key.** Bulk upload is the same operation as single-POST at scale, not a judgment-consequence mutation like delete or suspect-flag.
- **Implementation reuses `AirQualityService.createReading` per row**, not a bespoke bulk-insert path. Every row gets identical validation, audit logging (same `source: 'local'` rule from P1 — bulk-uploaded readings are real researcher data, audited the same as a single POST, not treated like high-volume OpenAQ sync noise), and response shape as a single POST — just looped, with per-row error isolation instead of one shared try/catch.

## Components

**Schema** (`prisma/schema.prisma`, `AirQuality` model): add `measuredAt DateTime?`.

**CSV parsing dependency**: `csv-parse` (the standard, well-maintained Node CSV parser — handles quoted fields with embedded commas correctly, e.g. `weatherConditions: "Sunny, light wind"`; hand-rolling this is a real wheel not worth reinventing).

**`POST /air-quality/bulk-upload`** (new route, `AirQualityController`, multipart file upload via `@UseInterceptors(FileInterceptor('file'))`, public):
- Parses the uploaded CSV into rows.
- Columns: `stationId` (required), `measuredAt` (required, ISO 8601), then every existing optional `CreateAirQualityDto` field (`pm25`, `pm10`, `co`, `no2`, `o3`, `so2`, `instrumentModel`, `calibrationDate`, `samplingDurationMinutes`, `weatherConditions`, `temperature`, `humidity`).
- Row count capped at `MAX_CSV_ROWS` (matching the clamp convention every other endpoint already follows) — file exceeding the cap is rejected outright (400), nothing inserted.
- Each row is validated the same way a single POST body is (same class-validator rules via a per-row DTO instance), then passed to `AirQualityService.createReading(stationId, data, 'local', userId, measuredAt)`.
- Response: `{ inserted: number, errors: { row: number, message: string }[] }`.

**`AirQualityService.createReading`**: gains one more optional parameter, `measuredAt?: Date | null`, passed straight through into the repository create call. Single-POST callers (controller's existing `create()`) don't pass it — stays `null`/unset there, exactly current behavior.

**The four P2 query methods**: each changes its `since`-based filtering to compare against `COALESCE("measuredAt", "createdAt")` instead of `createdAt` alone. Prisma doesn't express `COALESCE` in its query builder directly for a `where` filter on a computed value — this needs either a small raw-SQL fragment via `Prisma.sql` for the comparison, or (simpler, no raw SQL) fetching with a slightly wider `OR` filter (`OR: [{ measuredAt: { gte: since } }, { measuredAt: null, createdAt: { gte: since } }]`) which is expressible entirely in Prisma's query builder. The implementation plan will pick the Prisma-native `OR` form to avoid raw SQL, consistent with how the rest of this codebase avoids `$queryRaw`.

## Data flow

CSV file → `csv-parse` → array of row objects → each row: build a plain object matching `CreateAirQualityDto`'s shape, run it through `class-validator`'s `validate()` directly (the same way the global `ValidationPipe` validates a single POST body, just invoked manually per row instead of via the pipe) → valid row calls `createReading(...)` → invalid row appends `{ row, message }` to the errors array and moves to the next row. No row's failure affects any other row.

## Error handling

- Unparseable CSV (bad format, wrong content-type) → 400 before any row is touched.
- File exceeding `MAX_CSV_ROWS` → 400, nothing inserted.
- A row with a nonexistent `stationId`, invalid `measuredAt`, or an out-of-range pollutant value → that row's error captured, every other valid row still inserted.
- Empty file (header only, no data rows) → `{ inserted: 0, errors: [] }`, not an error — a valid, empty batch.

## Testing

- `measuredAt` round-trips through `createReading` unchanged (same pattern as P2 Task 1's metadata-field test).
- Each of the four updated queries: a reading with `measuredAt` two weeks in the past, fetched with a `?hours=` window that only covers the recent past by `createdAt` — must NOT appear (windowed by `measuredAt`, not `createdAt`). A reading with `measuredAt` null (old-style, pre-P3) — must still window correctly by `createdAt` (fallback path).
- CSV upload: a valid multi-row file → all inserted, correct `inserted` count, empty `errors`. A file with one bad row (nonexistent `stationId`) → N-1 inserted, exactly one error at the correct row number. A file exceeding `MAX_CSV_ROWS` → 400. An empty (header-only) file → `{ inserted: 0, errors: [] }`.
- Duplicate detection: two readings with the same `stationId`, identical pollutant values, and identical `measuredAt`, but `createdAt` values hours apart (simulating a re-uploaded CSV) → still grouped as duplicates.

## Out of scope (not this plan)

Any actual offline-first client/mobile app (out of this backend repo's scope entirely). CSV *export* (that's P4). Editing/re-uploading a partially-failed batch as a special "retry" flow — the researcher just fixes the bad rows and re-uploads a corrected CSV; with the `measuredAt`-aware duplicate check above, accidentally re-uploading rows that already succeeded is now genuinely catchable via `GET /air-quality/city/:city/duplicates`, the same as any other duplicate.
