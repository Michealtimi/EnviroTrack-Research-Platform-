/*
  Warnings:

  - You are about to drop the column `source` on the `AirQuality` table. All the data in the column will be lost.
  - You are about to drop the column `externalId` on the `Station` table. All the data in the column will be lost.
  - You are about to drop the column `source` on the `Station` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[openaqStationId]` on the table `Station` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."AirQuality" DROP COLUMN "source";

-- AlterTable
ALTER TABLE "public"."Station" DROP COLUMN "externalId",
DROP COLUMN "source",
ADD COLUMN     "openaqStationId" TEXT;

-- CreateTable
CREATE TABLE "public"."OpenAQStation" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "provider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpenAQStation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OpenAQParameter" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "units" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpenAQParameter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OpenAQMeasurement" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "parameterId" INTEGER NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "dateUtc" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpenAQMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OpenAQSyncLog" (
    "id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpenAQSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OpenAQParameter_name_key" ON "public"."OpenAQParameter"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Station_openaqStationId_key" ON "public"."Station"("openaqStationId");

-- AddForeignKey
ALTER TABLE "public"."OpenAQMeasurement" ADD CONSTRAINT "OpenAQMeasurement_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "public"."OpenAQStation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OpenAQMeasurement" ADD CONSTRAINT "OpenAQMeasurement_parameterId_fkey" FOREIGN KEY ("parameterId") REFERENCES "public"."OpenAQParameter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
