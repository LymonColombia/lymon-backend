import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsOptional,
  IsString,
  IsUrl,
  MinLength,
} from 'class-validator';

export class UpdateIncidentReportDto {
  @ApiPropertyOptional({
    example: 'General damage',
    description: 'Updated title of the incident report',
  })
  @IsOptional()
  @IsString()
  @MinLength(5)
  title?: string;

  @ApiPropertyOptional({
    example: 'A glass was broken after the guests left.',
    description: 'Updated description of the incident',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  description?: string;

  @ApiPropertyOptional({
    example: ['https://storage.example.com/photo1.jpg'],
    description: 'Updated list of attachment URLs (replaces existing list)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsUrl({}, { each: true })
  attachmentUrls?: string[];
}
