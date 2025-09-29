EnviroTrack Research Platform


<div align="center"> <img src="https://user-images.githubusercontent.com/12345/your-logo-url-here.svg" alt="EnviroTrack Logo" align="center" width="200" /> </div>
EnviroTrack is a robust, NestJS-based platform designed to collect, store, and serve environmental data, with a primary focus on air quality. It aggregates data from both user-created monitoring stations and the public OpenAQ API, providing a unified source for environmental research.

Storing and combining environmental data from disparate sources is complex. EnviroTrack simplifies this by automatically syncing with the OpenAQ global network and providing a clean API for researchers to contribute and retrieve data.

✨ Features

🌱 Getting Started

🏗️ API Usage

🔧 How It Works

❓ FAQ

✨ Features
Unified Data Model: Combines local station data with data synced from OpenAQ into a single, queryable API.

Automated Data Sync: A cron job runs every hour to fetch the latest air quality measurements from thousands of OpenAQ monitoring stations worldwide.

Local Data Ingestion: A REST API allows researchers to define their own "local" monitoring stations and submit air quality readings for them.

RESTful API: A clean, well-defined API for managing stations and retrieving unified data, documented with Swagger.

Scalable Architecture: Built with NestJS, using Prisma for type-safe database access and a modular structure for easy extension.

Extensible: Modular design makes it easy to add new data sources or features.

🌱 Getting Started
These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

Prerequisites
Node.js (v18 or later recommended)

Yarn (or npm)

PostgreSQL or Docker (for running a local database)

An OpenAQ API Key (it's free!)

Installation & Setup
Clone the repository:

bash
git clone https://github.com/Michealtimi/EnviroTrack-Research-Platform-.git
cd EnviroTrack-Research-Platform-
Install dependencies:

bash
npm install
# or
yarn install
Set up the database:
The easiest way to get a database is with Docker. This command will start a PostgreSQL instance in the background.

bash
docker-compose up -d
Configure Environment Variables:
Create a .env file in the root of the project by copying the example file:

bash
cp .env.example .env
Now, open the .env file and add your credentials:

env
# .env

# ------------------
# DATABASE
# ------------------
# Connection string for your PostgreSQL database
# Format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
DATABASE_URL="postgresql://user:password@localhost:5432/envirotrack?schema=public"

# ------------------
# OPENAQ API
# ------------------
# Get your free API key from https://openaq.org/
OPENAQ_API_KEY="your_openaq_api_key_here"
Run Database Migrations:
Apply the database schema using Prisma Migrate. This will create all the necessary tables.

bash
npx prisma migrate dev --name init
Run the Application:

bash
npm run start:dev
# or
yarn start:dev
The application will be running on http://localhost:3000.

🏗️ API Usage
The API is documented with Swagger and can be accessed at http://localhost:3000/api when the application is running. This interactive UI allows you to explore and test all available endpoints.

You can also interact with the EnviroTrack API using any HTTP client, like curl or Postman.

Create a Local Station
To add your own monitoring station (e.g., for a specific research project or a temporary sensor).

Endpoint: POST /stations

bash
curl -X POST http://localhost:3000/stations \
-H "Content-Type: application/json" \
-d '{
  "name": "Campus Quad Sensor",
  "city": "New York",
  "country": "US",
  "latitude": 40.7128,
  "longitude": -74.0060
}'
The API will respond with the newly created station object, including its id. Save this id to add readings for it.

Add an Air Quality Reading
Add a measurement for one of your local stations.

Endpoint: POST /air-quality

bash
# Assuming your new station has id: 101
curl -X POST http://localhost:3000/air-quality \
-H "Content-Type: application/json" \
-d '{
  "stationId": 101,
  "pm25": 45.2,
  "no2": 22.7,
  "co": 1.1
}'
Query for Stations (Unified)
This is the primary endpoint for analysis. It allows you to find stations from both OpenAQ and your local database, with powerful filtering.

Endpoint: GET /stations/unified

bash
# Find all stations in London
curl "http://localhost:3000/stations/unified?city=London"

# Find all local stations you have created
curl "http://localhost:3000/stations/unified?source=local"

# Paginate results
curl "http://localhost:3000/stations/unified?city=Paris&page=2&limit=50"
The response includes a source field (openaq or local) to distinguish the origin of the station data.

🔧 How It Works
The platform is composed of several key services that work together:

OpenAQSyncService: This service contains a cron job (@Cron) that runs every hour.

It calls the OpenAQ API to fetch a list of all global monitoring locations.

It uses the StationService to upsert these stations into our database, ensuring our list is always up-to-date.

It then iterates through our known OpenAQ stations and fetches the latest measurements for each, saving them via the AirQualityService.

StationModule: Manages the logic for creating, updating, and querying station information.

The StationController exposes the HTTP endpoints.

The StationService contains the business logic.

The StationRepository handles all direct database interactions via Prisma.

AirQualityModule: Manages the logic for recording and retrieving air quality measurements.

PrismaService: A singleton service that provides a configured Prisma Client instance to the rest of the application, centralizing the database connection.

❓ FAQ
How often does the data sync with OpenAQ?
The sync process is scheduled to run every hour. You can change this by modifying the CronExpression in openaq-sync.service.ts.

Can I trigger a sync manually?
Currently, the sync is only triggered by the cron schedule. A future improvement could be to add a protected API endpoint to trigger a sync on demand.

Why are some coordinates 0, 0 or city "Unknown"?
The syncStations function uses nullish coalescing operators (??) to provide default values if the data from the OpenAQ API is missing city, country, or coordinates. This ensures database integrity but may result in placeholder data.

How do I use this with import?
This is a NestJS project. All services, controllers, and modules use standard ES6 import/export syntax. For example:

typescript
// src/stations/station.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { StationRepository } from './station.repository.js';
// ...
Where can I find the API documentation?
When the application is running, visit http://localhost:3000/api for interactive Swagger documentation of all available endpoints.
