// src/station/dto/create-station.dto.ts
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
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

  @ApiProperty({ description: 'Latitude of the station', example: 51.5074 })
  @IsNumber()
  @IsNotEmpty()
  latitude: number;

  @ApiProperty({ description: 'Longitude of the station', example: -0.1278 })
  @IsNumber()
  @IsNotEmpty()
  longitude: number;
}





@Exclude() // Exclude all properties by default
export class StationResponseDto {
  @ApiProperty({ description: 'Unique identifier of the station', example: 1 })
  @Expose()
  id: number;

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
}


export class UpdateStationDto extends PartialType(CreateStationDto) {}