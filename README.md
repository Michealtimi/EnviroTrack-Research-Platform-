# 🌿 EnviroTrack: Unified Environmental Research Platform

**Topics:** #BackendEngineering | #DataEngineering | #EnvironmentalData | #NestJS | #OpenData | #ClimateTech

**EnviroTrack** is a robust, modular backend system that serves as a unified platform to collect, store, and expose critical environmental data, with a primary focus on **air quality**. It aggregates data from multiple global APIs and user-defined local monitoring stations, providing a single, comprehensive source for environmental research, policy analysis, and climate-focused applications.

Built on **NestJS (TypeScript)** and **PostgreSQL**, EnviroTrack simplifies the complexity of storing and combining environmental data from disparate sources by automating synchronization, transformation, and exposure via clean REST APIs.

-----

## ✨ Features

### Unified Data Ingestion (ETL)

  * **Unified Data Model:** Combines local station data with data synced from multiple external sources (e.g., OpenAQ) into a single, queryable API.
  * **Automated Data Sync:** A cron job runs regularly to fetch the latest air quality measurements from thousands of global monitoring stations.
  * **Data Sources:** Currently integrates **OpenAQ API** (Air Quality) via an hourly sync job. NASA POWER and World Bank Data are planned — see Future Work.
  * **Local Data Ingestion:** A dedicated REST API allows researchers to define their own "local" monitoring stations and submit air quality readings for them.
  * **Admin-Protected Mutations:** Destructive and OpenAQ-sync-triggering routes (`DELETE /stations/:id`, `/openaq/*/sync`) require an `x-api-key` header — see "Protected routes" below. All reads and local station create/submit stay open in v1.

### Architecture & API

  * **RESTful API:** A clean, well-defined set of endpoints for managing stations and retrieving unified data, documented with **Swagger/OpenAPI**.
  * **Scalable Architecture:** Built with **NestJS**, using **Prisma** for type-safe database access and a modular structure for easy extension.
  * **Automated tests:** `npm test` (Jest) covers DTO validation, pagination clamping, the admin API-key guard, and the OpenAQ v3 sync mapper.
  * **Dockerized Deployment:** Simplified deployment and portability using **Docker** and **Docker Compose**.

-----

## 🧩 Architecture Overview

The platform uses an ETL (Extract, Transform, Load) approach to manage data from external sources and provides a unified access layer.

```text
[External APIs: OpenAQ / NASA / World Bank]
           ↓
[ETL Layer: Node.js/NestJS scripts for ingestion + transformation]
           ↓
[Database: PostgreSQL via Prisma ORM]
           ↓
[REST API: NestJS Backend]
           ↓
[Client/Dashboard (Optional)]
```

### ⚙️ Tech Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Backend** | **NestJS** (TypeScript) | Scalable, modular API framework. |
| **Database** | **PostgreSQL** (**Prisma ORM**) | Reliable relational storage and type-safe database access. |
| **ETL** | Node.js, Cron, Axios | Scripts for data extraction and scheduling. |
| **Deployment** | Docker, Docker Compose | Containerized environment for portability. |
| **Documentation** | Swagger / OpenAPI | Interactive API documentation. |

-----

## 🌱 Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing.

### Prerequisites

  * **Node.js** (v18 or later recommended)
  * **Yarn** or **npm**
  * **PostgreSQL** or **Docker**
  * An **OpenAQ API Key** (required for automated sync)

### Installation & Setup

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/Michealtimi/EnviroTrack-Research-Platform-.git
    cd EnviroTrack-Research-Platform-
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    # or
    # yarn install
    ```

3.  **Set up the database and app with Docker:**

    ```bash
    cp .env.example .env
    # edit .env: set OPENAQ_API_KEY and ADMIN_API_KEY
    docker compose up -d --build
    docker compose exec app npx prisma migrate deploy
    ```

    The application will be running on `http://localhost:3000`, Swagger docs at `http://localhost:3000/docs`.

    Prefer to run without Docker? Start a local Postgres, set `DATABASE_URL` in `.env` yourself, then run `npx prisma migrate deploy` and `npm run start:dev`.

-----

## 🏗️ API Usage

The API is documented with **Swagger** at **`http://localhost:3000/docs`** when the application is running.

### 🧪 Core API Endpoints

| Endpoint | Description | Example |
| :--- | :--- | :--- |
| **`POST /stations`** | Create a new local monitoring station. | `.../stations` |
| **`POST /air-quality/station/:stationId`** | Submit an air quality reading for a local station. | `.../air-quality/station/1` |
| **`GET /stations/unified`** | **Primary endpoint for analysis.** Retrieves stations from both OpenAQ and local database, with powerful filtering (city, source, etc.), paginated (limit clamped to 100). | `.../stations/unified?city=London` |
| **`GET /air-quality/city/:city/average`** | Average pollution for a city over a recent window (default 24h, `?hours=` to override). | `.../air-quality/city/Lagos/average?hours=48` |
| **`GET /air-quality/city/:city/hazardous`** | Readings exceeding WHO 2021 guideline levels over a recent window. | `.../air-quality/city/Lagos/hazardous` |
| **`DELETE /stations/:id`** | Delete a station (admin only). | `.../stations/1` |

### 🔐 Protected routes

`DELETE /stations/:id` and the `/openaq/*/sync` routes require an `x-api-key` header
matching the `ADMIN_API_KEY` environment variable. All read routes and local station
create/submit routes are open in v1.

### 🗑️ Deletion is non-destructive

`DELETE /stations/:id` soft-deletes (sets `deletedAt`) rather than removing the row —
research data is never hard-deleted by this API. A soft-deleted station 404s on every
`/stations` read route (direct lookup, list, city, unified); its historical readings
remain queryable through `/air-quality` by design — deleting a station never deletes
its measurement history. Known limitation: creating a new station with the same
name+city as a previously deleted one will still fail as "already exists," since the
uniqueness check doesn't yet account for `deletedAt`.

### ⚠️ Hazardous reading thresholds & exceedance factors

`GET /air-quality/city/:city/hazardous` flags a reading as hazardous when any of its six
pollutants exceeds its WHO 2021 Air Quality Guideline value over the requested window
(default 24h): PM2.5 > 15 µg/m³, PM10 > 45 µg/m³, NO2 > 25 µg/m³, SO2 > 40 µg/m³,
O3 > 100 µg/m³, CO > 4000 µg/m³. Each hazardous reading's response includes an
`exceedances` array — e.g. `{"pollutant": "no2", "value": 325, "limit": 25, "factor": 13}` —
so a policy analyst can read "NO2 at this station is 13x the WHO limit" directly off the API.

### 🩺 Sync health

`GET /openaq/sync-history?limit=` (public, clamped to 100) returns the most recent OpenAQ
sync log entries — one per phase (`stations`/`measurements`) per hourly run, each with a
`success`/`failed` status and a `details` object (`synced`, `failed`, `durationMs`). This is
how you tell whether the cron is silently failing instead of finding out from stale data.
The raw error message on a failed row is stored but not exposed on this public endpoint —
it's stripped before the response is sent, since this route requires no admin key.

### 🧪 Reading metadata

`POST /air-quality/station/:stationId` now accepts optional `instrumentModel`,
`calibrationDate`, `samplingDurationMinutes`, `weatherConditions`, `temperature`, and
`humidity` fields alongside the pollutant values — all returned back on every reading.

### 🚩 Suspect flag

`PATCH /air-quality/:id/suspect` (admin key required) marks a reading `{ isSuspect, suspectReason }`
without deleting it — research data is never destroyed, only annotated.

### 🔁 Duplicate detection

`GET /air-quality/city/:city/duplicates?hours=` (public, default 24h) surfaces candidate
duplicate readings — same station, identical pollutant values, submitted within 60 seconds
of each other — for a human to review. Nothing is auto-flagged or auto-deleted.

### 📊 Completeness

`GET /stations/:id/completeness?hours=` (public, default 24h) reports what fraction of
expected hours an OpenAQ-synced station actually reported in. Local stations return
`{ applicable: false }` — there's no fixed cadence to measure a field visit against.

-----

## 🔧 How It Works & Project Structure

The platform's core logic is managed by the following services and modules:

  * **OpenAQSyncService:** Runs an **hourly cron job** to fetch, upsert stations, and save the latest air quality measurements from the OpenAQ API.
  * **StationModule/AirQualityModule:** Manages the CRUD logic for both local and OpenAQ-sourced station and measurement data.
  * **PrismaService:** Centralizes the database connection and client for the entire application.

### 🧰 Project Structure

```text
src/
├── ingestion/       # ETL logic (e.g., OpenAQSyncService)
├── transformation/  # Data cleaning, normalization (currently integrated into services)
├── stations/        # Module for station management
├── air-quality/     # Module for measurement management
├── database/        # Prisma + PostgreSQL setup
└── tests/           # Unit & integration tests
```

-----

## 🌍 Data Sources

  * **OpenAQ API** (Air Quality)
  * **NASA POWER API** (Future)
  * **World Bank Data API** (Future)

-----

## ✨ Future Work

  * Integrate the NASA POWER and World Bank APIs fully to expand the dataset.
  * Add data visualization dashboard (React/Next.js).
  * Add **ML module for pollution prediction**.
  * Add protected API endpoint to trigger manual syncs.

-----

## 💡 Author

**Micheal Agunbiade**

Backend & Data Engineer | Environmental Informatics Enthusiast

  * 📧 michealagunbiade1@gmail.com
  * 🌐 [github.com/Michealtimi](https://www.google.com/search?q=https://github.com/Michealtimi)
  * 🔗 [linkedin.com/in/micheal-agunbiade](https://www.google.com/search?q=https://linkedin.com/in/micheal-agunbiade)

-----

## 🧾 License

This project is released under the **MIT License**. You are free to use and modify it.
