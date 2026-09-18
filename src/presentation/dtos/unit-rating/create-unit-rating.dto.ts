import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateUnitRatingDto {
  @ApiProperty({ example: '64f1a2b3-c4d5-e6f7-a8b9-c0d200000000', description: 'Reservation ID' })
  @IsUUID()
  @IsNotEmpty()
  reservationId: string;

  @ApiProperty({ example: 4, description: 'Rating score from 1 to 5', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  rate: number;

  @ApiPropertyOptional({ example: 'Great place, very clean!', description: 'Optional review message', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}
