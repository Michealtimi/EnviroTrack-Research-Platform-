# EnviroTrack Research Platform (ETRP)

ETRP is a robust, NestJS-based platform designed to collect, store, and serve environmental data, with a primary focus on air quality. It aggregates data from both user-created monitoring stations and the public [OpenAQ API](https://openaq.org/), providing a unified source for environmental research.

## Features

-   **Unified Data Model**: Combines local station data with data synced from OpenAQ into a single, queryable API.
-   **Automated Sync**: A background cron job runs hourly to fetch the latest station and measurement data from the OpenAQ platform.
-   **RESTful API**: A clean, well-defined API for managing stations and retrieving unified data, documented with Swagger.
-   **Scalable Architecture**: Built with NestJS, using Prisma for type-safe database access and a modular structure for easy extension.
-   **Extensible**: Modular design makes it easy to add new data sources or features.

## Getting Started

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

-   [Node.js](https://nodejs.org/) (v18 or later recommended)
-   [Yarn](https://yarnpkg.com/) (or npm)
-   [Docker](https://www.docker.com/) (for running a local PostgreSQL database)
-   An [OpenAQ API Key](https://openaq.org/developers) (it's free!)

### Installation & Setup

1.  **Clone the repository:**
    ```bash
    git clone <your-repository-url>
    cd envirotrack-research-platform-etrp
    ```

2.  **Install dependencies:**
    ```bash
    yarn install
    ```

3.  **Set up the database:**
    The easiest way to get a database is with Docker. This command will start a PostgreSQL instance in the background.
    ```bash
    docker-compose up -d
    ```

4.  **Configure Environment Variables:**
    Create a `.env` file in the root of the project by copying the example file:
    ```bash
    cp .env.example .env
    ```
    Now, open the `.env` file and add your credentials:

    ```env
    # .env

    # This is the connection string for the local Docker database
    DATABASE_URL="postgresql://user:password@localhost:5432/etpr?schema=public"

    # Get your free API key from https://openaq.org/
    OPENAQ_API_KEY="your_openaq_api_key_here"
    ```

5.  **Run Database Migrations:**
    Apply the database schema using Prisma Migrate. This will create all the necessary tables.
    ```bash
    npx prisma migrate dev --name init
    ```

6.  **Run the Application:**
    ```bash
    yarn start:dev
    ```
    The application will be running on `http://localhost:3000`.

## API Usage

The API is documented with Swagger and can be accessed at **`http://localhost:3000/api`** when the application is running. This interactive UI allows you to explore and test all available endpoints.

-   **Stations**: `http://localhost:3000/stations`
-   **OpenAQ Sync**: `http://localhost:3000/openaq`

---
