# P4: Hazardous/Exceedance CSV Export — Design

## Context

P0-P3 (all merged) made the API honest, provenanced, metadata-rich, and offline-capture-ready. P4 was originally scoped as two different things: exports (CSV/PDF) and data licensing/plain-language output. Those were split — this plan covers exports only; licensing/plain-language is a separate, mostly non-code pass once the actual license terms are decided.

Exports were further scoped down from "everything exportable" to exactly what the audit called out: the policy analyst persona's ask — "which locations exceeded WHO limits, when, and by how much" — which the hazardous/exceedance endpoint (P1) already answers as JSON. This plan gets that answer into a spreadsheet. PDF is an explicit follow-up, not part of this plan.

## Decisions (from brainstorming)

- **Scope: hazardous/exceedance data only.** Not raw readings, not averages — the one report a policy analyst explicitly asked for. Other export targets can follow if actually requested.
- **Format: CSV only.** PDF needs a rendering library and real report-layout design work; CSV solves "put this in a spreadsheet or report tool" for most policy-analyst workflows today (Excel/Sheets both import CSV directly).
- **Endpoint shape: `?format=csv` on the existing `GET /air-quality/city/:city/hazardous`**, not a new route. Same auth level (public), same `?hours=` param, same underlying query — matches the endpoint's existing pattern of branching on a query param, avoids a second route to keep in sync as the query evolves.
- **Row shape: one row per exceedance, not per reading.** A reading with 2 exceedances (e.g. both PM2.5 and NO2 over limit) produces 2 CSV rows. This is what a policy analyst actually wants — filter/sort/pivot by pollutant or factor directly in a spreadsheet, not a squeezed multi-value text column.
- **Station name included via a small repository change**, not just the numeric `stationId` — a report referencing "Station 7" is far less useful than one referencing "Ijebu-Ode Roadside."
- **No new CSV-writing dependency.** Nine fixed columns, no arbitrary user text beyond station name (which gets defensive quoting) — hand-rolling this is well within "shortest thing that works," reaching for a library would be over-engineering for a column set this small and fixed.

## Components

**`AirQualityRepository.findAll`**: add `include: { station: { select: { name: true } } }` to the Prisma query. Every returned reading gains a `station: { name: string }` property alongside its existing `stationId`. Existing callers (`getReadingsByStation`, `getReadingsByCity`, `getHazardousReadings`, `findDuplicates`, `getCompleteness`) are unaffected — they don't destructure `station`, so the extra property is inert for them.

**CSV columns** (one row per exceedance): `stationId, stationName, pollutant, value, limit, factor, measuredAt, isSuspect, readingId`. `measuredAt` uses the same `measuredAt ?? createdAt` fallback established in P3, for consistency with every other date-bearing field in the API.

**`AirQualityController.hazardous`**: gains a `format` query param. When `format === 'csv'`, the handler builds a CSV string from the same `getHazardousReadings` result already computed for the JSON path, sets `Content-Type: text/csv` and `Content-Disposition: attachment; filename="..."` via Nest's `@Res()`, and writes the CSV directly (bypassing the global JSON response serialization). Any other value (or absent `format`) returns JSON exactly as today — permissive default, consistent with how `?hours=` already behaves when malformed.

**CSV formatting helper**: a small, pure function (reading[] with exceedances → CSV string) that:
- Flattens each reading's `exceedances` array into one row per entry.
- Quotes any field containing a comma, quote character, or newline (RFC 4180 minimal quoting) — the only field realistically at risk is `stationName`, since every other column is a controlled numeric/enum/date value.
- Produces a header-only CSV (no data rows) when the input array is empty — not an error, an empty result is a valid, expected outcome (a city with nothing hazardous in the window).

## Data flow

Controller calls `getHazardousReadings(city, hours)` — completely unchanged from today. If `format=csv`, the controller (not the service) flattens the same result into CSV rows and writes the response directly. The service's return type and behavior are untouched; CSV is purely a response-formatting concern layered on top in the controller, keeping `AirQualityService` focused on business logic, not output format.

## Error handling

No hazardous readings for the window → CSV with header row only (same "empty is valid" precedent P3's bulk upload already established for a zero-row result). Any `format` value other than exactly `csv` → treated as JSON, not an error.

## Testing

- CSV formatting helper, tested directly (no HTTP layer needed): a reading with 2 exceedances → 2 rows with correct field values; an empty readings array → header row only; a station name containing a comma → correctly quoted per RFC 4180.
- `AirQualityRepository.findAll`'s Prisma call includes the new `include` clause — verified via the mocked `prisma.airQuality.findMany` call arguments, same pattern as every other repository test in this codebase.
- Controller-level: `format=csv` sets the correct `Content-Type`/`Content-Disposition` headers (verified via a mocked `Response` object); `format` absent or anything else still returns the existing JSON shape unchanged.

## Out of scope (not this plan)

PDF export (explicit follow-up once CSV usage confirms there's a real need for a print-ready document). Export support for raw readings, averages, or any endpoint besides hazardous/exceedance. Data licensing and plain-language output (P4's other originally-scoped piece — separate, mostly non-code pass).
