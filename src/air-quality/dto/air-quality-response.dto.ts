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

  @ApiProperty({ description: 'Carbon monoxide µg/m³', example: 1200, nullable: true })
  @Expose()
  co: number | null;

  @ApiProperty({ description: 'Nitrogen dioxide µg/m³', example: 18, nullable: true })
  @Expose()
  no2: number | null;

  @ApiProperty({ description: 'Ozone µg/m³', example: 40, nullable: true })
  @Expose()
  o3: number | null;

  @ApiProperty({ description: 'Sulfur dioxide µg/m³', example: 12, nullable: true })
  @Expose()
  so2: number | null;

  @ApiProperty({ description: 'Timestamp of the reading', example: '2025-09-20T14:00:00.000Z' })
  @Expose()
  createdAt: Date;
}

export class ExceedanceDto {
  @ApiProperty({ description: 'Pollutant that exceeded its WHO 2021 guideline value', example: 'no2' })
  pollutant: string;

  @ApiProperty({ description: 'Measured value, µg/m³', example: 325 })
  value: number;

  @ApiProperty({ description: 'WHO 2021 guideline limit, µg/m³', example: 25 })
  limit: number;

  @ApiProperty({ description: 'Multiple of the WHO limit (value / limit, rounded to 1 decimal)', example: 13 })
  factor: number;
}

export class HazardousReadingResponseDto extends AirQualityReadingResponseDto {
  @ApiProperty({ description: 'Pollutants that exceeded their WHO 2021 guideline value, with the exceedance factor', type: [ExceedanceDto] })
  exceedances: ExceedanceDto[];
}