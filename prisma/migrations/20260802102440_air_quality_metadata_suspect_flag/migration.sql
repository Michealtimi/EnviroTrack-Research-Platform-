-- AlterTable
ALTER TABLE "AirQuality" ADD COLUMN     "calibrationDate" TIMESTAMP(3),
ADD COLUMN     "humidity" DOUBLE PRECISION,
ADD COLUMN     "instrumentModel" TEXT,
ADD COLUMN     "isSuspect" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "samplingDurationMinutes" INTEGER,
ADD COLUMN     "suspectReason" TEXT,
ADD COLUMN     "temperature" DOUBLE PRECISION,
ADD COLUMN     "weatherConditions" TEXT;
