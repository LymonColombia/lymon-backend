import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsCalendarDate } from '@/presentation/common/decorators/is-calendar-date.decorator';

export class BaseReservationDto {
  @ApiProperty({
    example: '64f1a2b3-c4d5-e6f7-a8b9-c0d100000000',
    description: 'Tenant ID (property management company)',
  })
  @IsUUID()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ example: '64f1a2b3-c4d5-e6f7-a8b9-c0d200000000' })
  @IsUUID()
  @IsNotEmpty()
  propertyId: string;

  @ApiProperty({ example: '64f1a2b3-c4d5-e6f7-a8b9-c0d300000000' })
  @IsUUID()
  @IsNotEmpty()
  unitId: string;

  @ApiProperty({ example: '2026-06-01', description: 'YYYY-MM-DD, no time' })
  @IsCalendarDate()
  checkIn: string;

  @ApiProperty({ example: '2026-06-05', description: 'YYYY-MM-DD, no time' })
  @IsCalendarDate()
  checkOut: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  guestsCount: number;

  @ApiPropertyOptional({ example: 'Late check-in requested' })
  @IsOptional()
  @IsString()
  notes?: string;
}
