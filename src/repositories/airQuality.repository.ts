// src/repositories/airQuality.repository.ts
import { PrismaClient, AirQuality } from '@prisma/client';

const prisma = new PrismaClient();

export class AirQualityRepository {
  // Create a new air quality reading
  async create(data: Omit<AirQuality, 'id' | 'createdAt'>): Promise<AirQuality> {
    console.log('[AirQualityRepository] Creating new reading:', data);

    const result = await prisma.airQuality.create({ data });

    console.log('[AirQualityRepository] Created reading:', result);
    return result;
  }

  // Get all readings (with optional filters)
  async findAll(filter?: { city?: string; stationId?: number }): Promise<AirQuality[]> {
    console.log('[AirQualityRepository] Finding readings with filter:', filter);

    const result = await prisma.airQuality.findMany({
      where: {
        ...(filter?.city && { city: filter.city }),
        ...(filter?.stationId && { stationId: filter.stationId }),
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log(`[AirQualityRepository] Found ${result.length} readings`);
    return result;
  }

  // Find by ID
  async findById(id: number): Promise<AirQuality | null> {
    console.log('[AirQualityRepository] Finding reading by ID:', id);

    const result = await prisma.airQuality.findUnique({ where: { id } });

    if (!result) {
      console.log('[AirQualityRepository] No reading found for ID:', id);
    }
    return result;
  }

  // Delete by ID
  async delete(id: number): Promise<AirQuality> {
    console.log('[AirQualityRepository] Deleting reading by ID:', id);

    const result = await prisma.airQuality.delete({ where: { id } });

    console.log('[AirQualityRepository] Deleted reading:', result);
    return result;
  }
}
