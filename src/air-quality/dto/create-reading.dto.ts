// src/air-quality/dto/create-air-quality.dto.ts
import { IsNumber, IsOptional, Max, Min } from 'class-validator';
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

  @ApiProperty({ description: 'Carbon monoxide ppm', example: 1.2, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500)
  co?: number;

  @ApiProperty({ description: 'Nitrogen dioxide ppm', example: 0.8, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500)
  no2?: number;

  @ApiProperty({ description: 'Ozone ppm', example: 0.05, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500)
  o3?: number;

  @ApiProperty({ description: 'Sulfur dioxide ppm', example: 0.02, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500)
  so2?: number;
}
