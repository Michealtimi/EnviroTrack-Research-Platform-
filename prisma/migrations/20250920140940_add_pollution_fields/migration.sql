/*
  Warnings:

  - You are about to drop the column `parameter` on the `AirQuality` table. All the data in the column will be lost.
  - You are about to drop the column `recordedAt` on the `AirQuality` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `AirQuality` table. All the data in the column will be lost.
  - You are about to drop the column `value` on the `AirQuality` table. All the data in the column will be lost.
  - Added the required column `pm10` to the `AirQuality` table without a default value. This is not possible if the table is not empty.
  - Added the required column `pm25` to the `AirQuality` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."AirQuality" DROP COLUMN "parameter",
DROP COLUMN "recordedAt",
DROP COLUMN "unit",
DROP COLUMN "value",
ADD COLUMN     "co" DOUBLE PRECISION,
ADD COLUMN     "no2" DOUBLE PRECISION,
ADD COLUMN     "o3" DOUBLE PRECISION,
ADD COLUMN     "pm10" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "pm25" DOUBLE PRECISION NOT NULL;
