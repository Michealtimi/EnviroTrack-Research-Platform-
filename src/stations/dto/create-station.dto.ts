// src/station/dto/create-station.dto.ts
import { IsNotEmpty, IsNumber, IsString, Max, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

export class CreateStationDto {
  @ApiProperty({ description: 'Name of the monitoring station', example: 'London Central' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'City where the station is located', example: 'London' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ description: 'Country where the station is located', example: 'UK' })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiProperty({ description: 'Latitude of the station', example: 51.5074, minimum: -90, maximum: 90 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @ApiProperty({ description: 'Longitude of the station', example: -0.1278, minimum: -180, maximum: 180 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}





@Exclude() // Exclude all properties by default
export class StationResponseDto {
  @ApiProperty({ description: 'Unique identifier of the station', example: 1 })
  @Expose()
  id: number;

  @ApiProperty({ description: 'The source of the station data', example: 'local', enum: ['local', 'openaq'] })
  @Expose()
  source: 'local' | 'openaq';

  @ApiProperty({ description: 'Name of the monitoring station', example: 'London Central' })
  @Expose()
  name: string;

  @ApiProperty({ description: 'City where the station is located', example: 'London' })
  @Expose()
  city: string;

  @ApiProperty({ description: 'Country where the station is located', example: 'UK' })
  @Expose()
  country: string;

  @ApiProperty({ description: 'Latitude of the station', example: 51.5074 })
  @Expose()
  latitude: number;

  @ApiProperty({ description: 'Longitude of the station', example: -0.1278 })
  @Expose()
  longitude: number;

  @ApiProperty({ description: 'Timestamp when the station was created', example: '2025-09-20T14:00:00.000Z' })
  @Expose()
  createdAt: Date;

  @ApiProperty({ description: 'External ID if from another source like OpenAQ', example: '12345', required: false })
  @Expose()
  externalId: string | null;
}


export class UpdateStationDto extends PartialType(CreateStationDto) {}