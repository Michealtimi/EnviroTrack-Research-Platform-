# EnviroTrack

An environmental data API for collecting, organizing, and exploring air-quality observations across monitoring stations. The backend supports data ingestion, external data synchronization, reporting, and protected write operations.

## Features

- Monitoring-station and air-quality reading management
- CSV data ingestion
- Synchronization with the OpenAQ API
- Synchronization history and operational visibility
- Station-level and city-level summaries
- Latest readings and reporting endpoints
- Duplicate and exceedance flagging
- CSV export
- API-key-protected write operations
- Request rate limiting
- Swagger API documentation

## Technology

- Node.js and NestJS 11
- TypeScript
- PostgreSQL and Prisma
- OpenAQ integration
- class-validator
- Jest

## Getting started

### Prerequisites

- Node.js 20 or later
- PostgreSQL
- Yarn
- An OpenAQ API key for external synchronization

### Installation

```bash
git clone https://github.com/Michealtimi/EnviroTrack-Research-Platform-.git
cd EnviroTrack-Research-Platform-
yarn install
cp .env.example .env
```

Configure the environment:

```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/envirotrack"
OPENAQ_API_KEY="your-openaq-api-key"
ADMIN_API_KEY="choose-a-long-random-secret"
PORT=3000
```

Optional synchronization settings are documented in the example environment file.

Generate the Prisma client, apply the project's migrations, and start the development server:

```bash
npx prisma generate
npx prisma migrate dev
yarn start:dev
```

The API is served at `http://localhost:3000`; Swagger documentation is available at `/docs`.

## Testing

```bash
yarn test
yarn test:e2e
```

See `package.json` for the complete set of available scripts.

## Scope and data interpretation

EnviroTrack is a research and data-management application. It should not be treated as a certified regulatory monitoring system. Any comparison with WHO guideline values is informational and does not constitute regulatory certification or a health assessment. Data quality, station coverage, units, timestamps, and source provenance should be checked before drawing conclusions.

## License

MIT
