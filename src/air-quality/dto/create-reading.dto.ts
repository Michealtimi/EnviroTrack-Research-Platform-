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
}
