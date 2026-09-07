import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsString,
  IsInt,
  Min,
  Max,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateShiftDto {
  @ApiProperty({
    example: 'Morning Front Desk',
    description: 'Shift name',
  })
  @IsString()
  @MaxLength(150)
  name!: string;

  @ApiPropertyOptional({
    example: ['680c79f3-8b4f-98f4-f638-3b1200000000', '680c79f3-8b4f-98f4-f638-3b1400000000'],
    description: 'Optional assigned staff user ids. Can be empty on create.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty({ each: true })
  staffMemberIds?: string[];

  @ApiProperty({
    example: '680c79f3-8b4f-98f4-f638-3b1300000000',
    description: 'Property id where shift takes place',
  })
  @IsString()
  @IsNotEmpty()
  propertyId!: string;

  @ApiProperty({
    example: '2026-04-11',
    description: 'Shift start date in ISO format (YYYY-MM-DD)',
  })
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate!: string;

  @ApiPropertyOptional({
    example: '2026-05-11',
    description:
      'Optional shift end date in ISO format (YYYY-MM-DD). If omitted, shift is open-ended.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  endDate?: string;

  @ApiProperty({
    example: '09:00',
    description: 'Shift start hour (24h HH:mm)',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startHour!: string;

  @ApiProperty({
    example: '17:00',
    description: 'Shift end hour (24h HH:mm)',
  })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  endHour!: string;

  @ApiPropertyOptional({
    example: [1, 3],
    description:
      'Optional weekdays the shift repeats on (0=Sunday, 1=Monday, ..., 6=Saturday). If omitted, shift applies every day.',
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weekdays?: number[];

  @ApiPropertyOptional({
    example: 'Staff requested an earlier finish for personal reasons.',
    description: 'Optional internal note for this shift',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
