import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
} from 'class-validator';

export class CreateIncidentReportDto {
  @ApiProperty({
    example: 'General damage',
    description: 'Title of the incident report',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'A glass was broken after the guests left.',
    description: 'Detailed description of the incident',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    example: '64f1a2b3-c4d5-e6f7-a8b9-c0d200000000',
    description: 'ID of the property where the incident occurred',
  })
  @IsUUID()
  propertyId: string;

  @ApiPropertyOptional({
    example: ['https://storage.example.com/photo1.jpg'],
    description:
      'URLs of files attached to this report (upload handled separately)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsUrl({}, { each: true })
  attachmentUrls?: string[];
}
