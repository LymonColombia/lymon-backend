import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { BaseReservationDto } from '@/presentation/dtos/reservation/base-reservation.dto';

export class SetCartReservationDto extends BaseReservationDto {
  @ApiProperty({ example: 200000 })
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  pricePerNight: number;
}
