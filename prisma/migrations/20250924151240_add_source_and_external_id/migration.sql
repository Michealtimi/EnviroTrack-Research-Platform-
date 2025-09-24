/*
  Warnings:

  - A unique constraint covering the columns `[externalId]` on the table `Station` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."AirQuality" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'local';

-- AlterTable
ALTER TABLE "public"."Station" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'local';

-- CreateIndex
CREATE UNIQUE INDEX "Station_externalId_key" ON "public"."Station"("externalId");
