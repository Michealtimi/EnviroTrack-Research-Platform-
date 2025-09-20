// src/air-quality/dto/create-air-quality.dto.ts
import { IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAirQualityDto {
  @ApiProperty({ description: 'Particulate matter 2.5 µg/m³', example: 15.5 })
  @IsNumber()
  @IsNotEmpty()
  pm25: number;

  @ApiProperty({ description: 'Particulate matter 10 µg/m³', example: 25.0 })
  @IsNumber()
  @IsNotEmpty()
  pm10: number;

  @ApiProperty({ description: 'Carbon monoxide ppm', example: 1.2 })
  @IsNumber()
  @IsNotEmpty()
  co: number;

  @ApiProperty({ description: 'Nitrogen dioxide ppm', example: 0.8 })
  @IsNumber()
  @IsNotEmpty()
  no2: number;
}