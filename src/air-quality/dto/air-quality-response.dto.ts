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

  @ApiProperty({ description: 'Particulate matter 2.5 µg/m³', example: 15.5 })
  @Expose()
  pm25: number;

  @ApiProperty({ description: 'Particulate matter 10 µg/m³', example: 25.0 })
  @Expose()
  pm10: number;

  @ApiProperty({ description: 'Carbon monoxide ppm', example: 1.2 })
  @Expose()
  co: number;

  @ApiProperty({ description: 'Nitrogen dioxide ppm', example: 0.8 })
  @Expose()
  no2: number;

  @ApiProperty({ description: 'Timestamp of the reading', example: '2025-09-20T14:00:00.000Z' })
  @Expose()
  createdAt: Date;
}