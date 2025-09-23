import { ApiProperty } from '@nestjs/swagger';

export class OpenAQMeasurementDto {
  @ApiProperty({ description: 'Station ID' })
  stationId: number;

  @ApiProperty({ description: 'Parameter ID' })
  parameterId: number;

  @ApiProperty({ description: 'Measured value' })
  value: number;

  @ApiProperty({ description: 'UTC timestamp of measurement' })
  dateUtc: string;
}
