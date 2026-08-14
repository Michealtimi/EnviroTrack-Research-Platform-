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

  @ApiProperty({ description: 'Instrument model used to take this reading', example: 'Aeroqual Series 500', nullable: true })
  @Expose()
  instrumentModel: string | null;

  @ApiProperty({ description: 'Date the instrument was last calibrated', example: '2026-06-01T00:00:00.000Z', nullable: true })
  @Expose()
  calibrationDate: Date | null;

  @ApiProperty({ description: 'Sampling duration, minutes', example: 15, nullable: true })
  @Expose()
  samplingDurationMinutes: number | null;

  @ApiProperty({ description: 'Weather conditions at the time of the reading', example: 'Sunny, light wind, 28°C', nullable: true })
  @Expose()
  weatherConditions: string | null;

  @ApiProperty({ description: 'Ambient temperature, °C', example: 28.4, nullable: true })
  @Expose()
  temperature: number | null;

  @ApiProperty({ description: 'Relative humidity, %', example: 61, nullable: true })
  @Expose()
  humidity: number | null;

  @ApiProperty({ description: 'When this reading was actually measured (if different from when the server received it)', example: '2026-07-15T09:00:00.000Z', nullable: true })
  @Expose()
  measuredAt: Date | null;

  @ApiProperty({ description: 'Whether a steward has flagged this reading as suspect', example: false })
  @Expose()
  isSuspect: boolean;

  @ApiProperty({ description: 'Steward-provided reason the reading is flagged suspect', example: null, nullable: true })
  @Expose()
  suspectReason: string | null;

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
  @ApiProperty({ description: 'Name of the station where this reading was taken', example: 'Ijebu-Ode Roadside' })
  stationName: string;

  @ApiProperty({ description: 'Pollutants that exceeded their WHO 2021 guideline value, with the exceedance factor', type: [ExceedanceDto] })
  exceedances: ExceedanceDto[];
}