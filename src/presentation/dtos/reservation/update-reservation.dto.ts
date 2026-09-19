import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { IsCalendarDate } from '@/presentation/common/decorators/is-calendar-date.decorator';

export class UpdateReservationDto {
  @ApiPropertyOptional({
    example: '2024-06-02',
    description: 'YYYY-MM-DD, no time',
  })
  @IsCalendarDate()
  @IsOptional()
  checkIn?: string;

  @ApiPropertyOptional({
    example: '2024-06-06',
    description: 'YYYY-MM-DD, no time',
  })
  @IsCalendarDate()
  @IsOptional()
  checkOut?: string;

  @ApiPropertyOptional({ example: 'Updated notes' })
  @IsString()
  @IsOptional()
  notes?: string;
}
