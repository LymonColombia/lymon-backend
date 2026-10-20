import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { ExperienceAvailabilityTypeEnum } from '@/domain/experience/value-objects/experience-availability-type.vo';
import { ExperienceScopeEnum } from '@/domain/experience/value-objects/experience-scope.vo';
import { ApiPropertyOptional } from '@nestjs/swagger';

class UpdateExperienceRecurrenceDto {
  @ApiPropertyOptional({ example: [1, 2, 3, 4, 5] })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek!: number[];

  @ApiPropertyOptional({ example: '08:00' })
  @IsString()
  @IsNotEmpty()
  startTime!: string;

  @ApiPropertyOptional({ example: '18:00' })
  @IsString()
  @IsNotEmpty()
  endTime!: string;
}

export class UpdateExperienceDto {
  @ApiPropertyOptional({ enum: ExperienceScopeEnum })
  @IsEnum(ExperienceScopeEnum)
  @IsOptional()
  scope?: ExperienceScopeEnum;

  @ApiPropertyOptional({ example: '6650d0ef-3f3d-2d2d-2d2d-2d2d00000000' })
  @IsString()
  @IsOptional()
  propertyId?: string;

  @ApiPropertyOptional({ example: 'Airport transfer' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: 'Private transfer from airport to property',
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 'Medellín' })
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 120000, minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  @IsOptional()
  priceCop?: number;

  @ApiPropertyOptional({
    example: 2,
    minimum: 1,
    description:
      'Minimum participants required for the experience to take place',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  minimumParticipants?: number;

  @ApiPropertyOptional({ example: 8, minimum: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;

  @ApiPropertyOptional({ enum: ExperienceAvailabilityTypeEnum })
  @IsEnum(ExperienceAvailabilityTypeEnum)
  @IsOptional()
  availabilityType?: ExperienceAvailabilityTypeEnum;

  @ApiPropertyOptional({ type: () => UpdateExperienceRecurrenceDto })
  @ValidateNested()
  @Type(() => UpdateExperienceRecurrenceDto)
  @IsOptional()
  recurrence?: UpdateExperienceRecurrenceDto;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  allowStandalonePurchase?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  allowReservationPurchase?: boolean;

  @ApiPropertyOptional({
    example: ['tenantId/1234-photo.jpg'],
    description: 'R2 object keys for uploaded media files',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mediaKeys?: string[];
}
