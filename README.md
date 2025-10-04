# 🌿 EnviroTrack: Unified Environmental Research Platform

**Topics:** #BackendEngineering | #DataEngineering | #EnvironmentalData | #NestJS | #OpenData | #ClimateTech

**EnviroTrack** is a robust, modular backend system that serves as a unified platform to collect, store, and expose critical environmental data, with a primary focus on **air quality**. It aggregates data from multiple global APIs and user-defined local monitoring stations, providing a single, comprehensive source for environmental research, policy analysis, and climate-focused applications.

Built on **NestJS (TypeScript)** and **PostgreSQL**, EnviroTrack simplifies the complexity of storing and combining environmental data from disparate sources by automating synchronization, transformation, and exposure via clean REST APIs.

-----

## ✨ Features

### Unified Data Ingestion (ETL)

  * **Unified Data Model:** Combines local station data with data synced from multiple external sources (e.g., OpenAQ) into a single, queryable API.
  * **Automated Data Sync:** A cron job runs regularly to fetch the latest air quality measurements from thousands of global monitoring stations.
  * **Extensible Data Sources:** Designed to support multiple external APIs, including:
      * ✅ **OpenAQ API** (Air Quality)
      * ✅ **NASA POWER API** (Temperature, Meteorological Data) *(Future Integration)*
      * ✅ **World Bank Data API** (Emissions, Economic Indicators) *(Future Integration)*
  * **Local Data Ingestion:** A dedicated REST API allows researchers to define their own "local" monitoring stations and submit air quality readings for them.

### Architecture & API

  * **RESTful API:** A clean, well-defined set of endpoints for managing stations and retrieving unified data, documented with **Swagger/OpenAPI**.
  * **Scalable Architecture:** Built with **NestJS**, using **Prisma** for type-safe database access and a modular structure for easy extension.
  * **Comprehensive Testing:** The project includes unit tests for core logic, including data upserts and retrieval.
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

3.  **Set up the database (Easiest with Docker):**

    ```bash
    docker-compose up -d
    ```

4.  **Configure Environment Variables:** Create a `.env` file and add your credentials:

    ```bash
    cp .env.example .env
    ```

    *Update `DATABASE_URL` and `OPENAQ_API_KEY` in the newly created `.env` file.*

5.  **Run Database Migrations:** Apply the database schema using Prisma Migrate.

    ```bash
    npx prisma migrate dev --name init
    ```

6.  **Start the Application:**

    ```bash
    npm run start:dev
    # or
    # yarn start:dev
    ```

    The application will be running on `http://localhost:3000`.

-----

## 🏗️ API Usage

The API is documented with **Swagger** at **`http://localhost:3000/api`** when the application is running.

### 🧪 Core API Endpoints

| Endpoint | Description | Example |
| :--- | :--- | :--- |
| **`POST /stations`** | Create a new local monitoring station. | `.../stations` |
| **`POST /air-quality`** | Submit an air quality reading for a local station. | `.../air-quality` |
| **`GET /stations/unified`** | **Primary endpoint for analysis.** Retrieves stations from both OpenAQ and local database, with powerful filtering (city, source, etc.). | `.../stations/unified?city=London` |
| **`/api/temperature`** | *Future* - Get aggregated temperature data. | `.../temperature?city=Lagos` |
| **`/api/emissions`** | *Future* - Get CO₂ emissions data. | `.../emissions?year=2024` |

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
