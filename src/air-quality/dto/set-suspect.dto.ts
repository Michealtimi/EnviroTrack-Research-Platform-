import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetSuspectDto {
  @ApiProperty({ description: 'Whether this reading should be flagged suspect', example: true })
  @IsBoolean()
  isSuspect: boolean;

  @ApiProperty({ description: 'Why this reading is suspect', example: 'Sensor drift suspected', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  suspectReason?: string;
}
