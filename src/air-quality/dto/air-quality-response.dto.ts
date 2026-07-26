// src/air-quality/dto/air-quality-response.dto.ts
import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

@Exclude() // Exclude all properties by default
export class AirQualityReadingResponseDto {
  @ApiProperty({ description: 'Unique identifier of the reading', example: 123 })
  @Expose()
  id: number;

  @ApiProperty({ description: 'ID of the associated station', example: 101 })
  @Expose()
  stationId: number;

  @ApiProperty({ description: 'Particulate matter 2.5 µg/m³', example: 15.5, nullable: true })
  @Expose()
  pm25: number | null;

  @ApiProperty({ description: 'Particulate matter 10 µg/m³', example: 25.0, nullable: true })
  @Expose()
  pm10: number | null;

  @ApiProperty({ description: 'Carbon monoxide ppm', example: 1.2, nullable: true })
  @Expose()
  co: number | null;

  @ApiProperty({ description: 'Nitrogen dioxide ppm', example: 0.8, nullable: true })
  @Expose()
  no2: number | null;

  @ApiProperty({ description: 'Ozone ppm', example: 0.05, nullable: true })
  @Expose()
  o3: number | null;

  @ApiProperty({ description: 'Sulfur dioxide ppm', example: 0.02, nullable: true })
  @Expose()
  so2: number | null;

  @ApiProperty({ description: 'Timestamp of the reading', example: '2025-09-20T14:00:00.000Z' })
  @Expose()
  createdAt: Date;
}