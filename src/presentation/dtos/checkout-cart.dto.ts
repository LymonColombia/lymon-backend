import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SetCartReservationDto } from './set-cart-reservation.dto';

class CheckoutCartExperienceItemDto {
  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty()
  @IsUUID()
  @IsNotEmpty()
  experienceId: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @IsPositive()
  @Type(() => Number)
  quantity: number;

  @ApiPropertyOptional({ description: 'ISO date string for fixed-date experiences' })
  @IsOptional()
  @IsDateString()
  selectedDate?: string;
}

export class CheckoutCartDto {
  @ApiPropertyOptional({ type: SetCartReservationDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SetCartReservationDto)
  reservationItem?: SetCartReservationDto;

  @ApiPropertyOptional({ type: [CheckoutCartExperienceItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CheckoutCartExperienceItemDto)
  experienceItems?: CheckoutCartExperienceItemDto[];
}
