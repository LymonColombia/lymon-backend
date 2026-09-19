import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CancelReservationDto {
  @ApiPropertyOptional({ example: 'Guest requested cancellation' })
  @IsString()
  @IsOptional()
  reason?: string;
}
