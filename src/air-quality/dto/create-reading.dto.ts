// src/air-quality/dto/create-air-quality.dto.ts
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAirQualityDto {
  @ApiProperty({ description: 'Particulate matter 2.5 µg/m³', example: 15.5, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2000)
  pm25?: number;

  @ApiProperty({ description: 'Particulate matter 10 µg/m³', example: 25.0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2000)
  pm10?: number;

  @ApiProperty({ description: 'Carbon monoxide µg/m³', example: 1200, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500)
  co?: number;

  @ApiProperty({ description: 'Nitrogen dioxide µg/m³', example: 18, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500)
  no2?: number;

  @ApiProperty({ description: 'Ozone µg/m³', example: 40, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500)
  o3?: number;

  @ApiProperty({ description: 'Sulfur dioxide µg/m³', example: 12, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500)
  so2?: number;

  @ApiProperty({ description: 'Instrument model used to take this reading', example: 'Aeroqual Series 500', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  instrumentModel?: string;

  @ApiProperty({ description: 'Date the instrument was last calibrated (ISO 8601)', example: '2026-06-01', required: false })
  @IsOptional()
  @IsDateString()
  calibrationDate?: string;

  @ApiProperty({ description: 'How long the sample was taken over, in minutes', example: 15, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  samplingDurationMinutes?: number;

  @ApiProperty({ description: 'Free-text weather conditions at the time of the reading', example: 'Sunny, light wind, 28°C', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  weatherConditions?: string;

  @ApiProperty({ description: 'Ambient temperature, °C', example: 28.4, required: false })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(60)
  temperature?: number;

  @ApiProperty({ description: 'Relative humidity, %', example: 61, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  humidity?: number;
}
