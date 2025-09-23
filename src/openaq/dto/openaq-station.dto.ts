import { ApiProperty } from '@nestjs/swagger';

export class OpenAQStationDto {
  @ApiProperty({ description: 'Station ID' })
  id: number;

  @ApiProperty({ description: 'Station name' })
  name: string;

  @ApiProperty({ description: 'City where station is located' })
  city: string;

  @ApiProperty({ description: 'Country code' })
  country: string;

  @ApiProperty({ description: 'Latitude' })
  latitude: number;

  @ApiProperty({ description: 'Longitude' })
  longitude: number;
}
