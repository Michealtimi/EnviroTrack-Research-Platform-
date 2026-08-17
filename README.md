# EnviroTrack

Environmental data API for tracking air quality readings across monitoring stations — built as the backend for an MSc research platform. Ingests readings (manually, via CSV, or synced from [OpenAQ](https://explore.openaq.org)), tracks station metadata, and surfaces hazardous/exceedance reports against WHO 2021 air quality guideline values.

## Tech stack

- [NestJS 11](https://nestjs.com/) (TypeScript, ESM)
- PostgreSQL via [Prisma](https://www.prisma.io/) 6
- [class-validator](https://github.com/typestack/class-validator) for request validation
- Swagger/OpenAPI docs at `/docs`
- Jest for tests

## Getting started

### Prerequisites

- Node.js 20+
- Yarn
- A PostgreSQL database (a free [Neon](https://neon.tech) instance works well)

### Setup

```bash
yarn install
cp .env.example .env
```

Fill in `.env`:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `OPENAQ_API_KEY` | Free key from [explore.openaq.org](https://explore.openaq.org), used by the OpenAQ sync |
| `ADMIN_API_KEY` | Random string. Required as `x-api-key` header on all write endpoints and the OpenAQ sync routes |
| `OPENAQ_SYNC_COUNTRY_ISO` | Optional. Restricts the scheduled OpenAQ sync to one country (ISO code) |
| `OPENAQ_SYNC_MAX_LOCATIONS` | Optional. Caps how many stations the scheduled sync pulls per run |
| `PORT` | Defaults to `3000` |

Apply the database schema:

```bash
yarn prisma:generate
yarn prisma:migrate
```

Run it:

```bash
yarn start:dev
```

API is now at `http://localhost:3000`, interactive docs at `http://localhost:3000/docs`.

## Scripts

| Command | Purpose |
|---|---|
| `yarn start:dev` | Run with hot reload |
| `yarn build` | Compile to `dist/` |
| `yarn test` | Run the Jest suite |
| `yarn lint` | ESLint (`--fix`) |
| `yarn format` | Prettier |
| `yarn prisma:studio` | Browse the database in Prisma Studio |

## API overview

All endpoints are namespaced under `/stations`, `/air-quality`, and `/openaq`. Full request/response schemas are in Swagger at `/docs`. Endpoints marked 🔒 require an `x-api-key` header matching `ADMIN_API_KEY`. All endpoints are rate-limited to 100 requests/minute per IP.

### Stations

| Method | Path | Notes |
|---|---|---|
| `POST` | `/stations` | Create a station |
| `GET` | `/stations` | List all stations |
| `GET` | `/stations/city/:city` | Stations in a city |
| `GET` | `/stations/unified` | Combined local + OpenAQ stations, paginated |
| `GET` | `/stations/:id/completeness` | Reporting completeness over a time window |
| `GET` | `/stations/:id` | Get one station |
| `PATCH` | `/stations/:id` | 🔒 Update a station |
| `DELETE` | `/stations/:id` | 🔒 Soft-delete a station |

### Air quality

| Method | Path | Notes |
|---|---|---|
| `POST` | `/air-quality/station/:stationId` | 🔒 Create a reading |
| `POST` | `/air-quality/bulk-upload` | 🔒 Bulk-import readings from a CSV file (≤2MB, ≤1000 rows) |
| `PATCH` | `/air-quality/:id/suspect` | 🔒 Flag/unflag a reading as suspect |
| `GET` | `/air-quality/station/:stationId` | Readings for a station |
| `GET` | `/air-quality/city/:city` | Readings for a city |
| `GET` | `/air-quality/city/:city/average` | Average pollution over a time window |
| `GET` | `/air-quality/city/:city/hazardous` | Readings exceeding WHO limits. Add `?format=csv` for a CSV download |
| `GET` | `/air-quality/city/:city/duplicates` | Candidate duplicate readings |
| `GET` | `/air-quality/station/:stationId/latest` | Latest reading for a station |

### OpenAQ sync

| Method | Path | Notes |
|---|---|---|
| `POST` | `/openaq/parameters/sync` | 🔒 Push-sync OpenAQ parameters |
| `POST` | `/openaq/measurements/sync` | 🔒 Push-sync OpenAQ measurements |
| `POST` | `/openaq/full-sync` | 🔒 Push-sync both |
| `GET` | `/openaq/sync-history` | View sync run history |

A separate scheduled job (`src/openaq/openaq-sync.service.ts`) also pulls from the OpenAQ v3 API on a cron and writes directly into the `Station`/`AirQuality` tables above.

## Example requests

```bash
# Create a station
curl -X POST http://localhost:3000/stations \
  -H "Content-Type: application/json" \
  -d '{"name":"Lagos Central","city":"Lagos","country":"NG","latitude":6.5244,"longitude":3.3792}'

# Add a reading (requires admin key)
curl -X POST http://localhost:3000/air-quality/station/1 \
  -H "Content-Type: application/json" -H "x-api-key: $ADMIN_API_KEY" \
  -d '{"pm25": 55.2, "no2": 30.1, "measuredAt": "2026-08-14T08:00:00Z"}'

# Hazardous readings for a city, as CSV
curl "http://localhost:3000/air-quality/city/Lagos/hazardous?hours=24&format=csv" -o hazardous.csv
```

## Testing

```bash
yarn test
```

Unit tests live in `test/*.spec.ts` (mocked Prisma layer — no live database required).

## License

MIT
