-- AlterTable
ALTER TABLE "public"."AirQuality" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'local';

-- AlterTable
ALTER TABLE "public"."Station" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'local';
