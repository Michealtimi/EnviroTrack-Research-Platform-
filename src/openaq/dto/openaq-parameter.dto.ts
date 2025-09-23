// src/openaq/dto/openaq-parameter.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class OpenAQParameterDto {
  @ApiProperty({ example: 2 })
  id: number;

  @ApiProperty({ example: 'pm25' })
  name: string;

  @ApiProperty({ example: 'PM2.5' })
  displayName: string;

  @ApiProperty({ example: 'µg/m³' })
  units: string;

  @ApiProperty({
    example: 'Particulate matter less than 2.5 micrometers in diameter mass concentration',
  })
  description: string;
}
