import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';

export class AddExperienceToCartDto {
  @ApiProperty()
  @IsUUID()
  tenantId: string;

  @ApiProperty()
  @IsUUID()
  experienceId: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @IsPositive()
  quantity: number;

  @ApiPropertyOptional({
    description: 'ISO date string for fixed-date experiences',
  })
  @IsOptional()
  @IsDateString()
  selectedDate?: string;

  @ApiPropertyOptional({
    description: 'Reservation ID if purchasing as add-on',
  })
  @IsOptional()
  @IsString()
  reservationId?: string;
}
