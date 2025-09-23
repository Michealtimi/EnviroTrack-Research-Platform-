import { ApiProperty } from '@nestjs/swagger';

export class UnifiedStationResponseDto {
  @ApiProperty({ example: 'local-1', description: 'Unique station ID (local or OpenAQ)' })
  id: string;

  @ApiProperty({ example: 'Lagos Main Station' })
  name: string;

  @ApiProperty({ example: 'Lagos' })
  city: string;

  @ApiProperty({ example: 'NG' })
  country: string;

  @ApiProperty({ example: 6.5244 })
  latitude: number;

  @ApiProperty({ example: 3.3792 })
  longitude: number;

  @ApiProperty({ example: 'local', enum: ['local', 'openaq'] })
  source: 'local' | 'openaq';
}
