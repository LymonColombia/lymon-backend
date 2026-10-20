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
import { ExperienceCategoryEnum } from '@/domain/experience/value-objects/experience-category.vo';
import { ExperienceScopeEnum } from '@/domain/experience/value-objects/experience-scope.vo';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ExperienceRecurrenceDto {
  @ApiProperty({
    example: [1, 2, 3, 4, 5],
    description: 'Week days in JS format (0=Sunday, 6=Saturday)',
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  daysOfWeek!: number[];

  @ApiProperty({
    example: '08:00',
    description: 'Recurring window start time in HH:mm',
  })
  @IsString()
  @IsNotEmpty()
  startTime!: string;

  @ApiProperty({
    example: '18:00',
    description: 'Recurring window end time in HH:mm',
  })
  @IsString()
  @IsNotEmpty()
  endTime!: string;
}

export class CreateExperienceDto {
  @ApiProperty({
    enum: ExperienceScopeEnum,
    example: ExperienceScopeEnum.PROPERTY,
  })
  @IsEnum(ExperienceScopeEnum)
  scope!: ExperienceScopeEnum;

  @ApiPropertyOptional({ example: '6650d0ef-3f3d-2d2d-2d2d-2d2d00000000' })
  @IsString()
  @IsOptional()
  propertyId?: string;

  @ApiProperty({ example: 'Airport transfer' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: 'Private transfer from airport to property',
    maxLength: 5000,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  description!: string;

  @ApiProperty({ example: 'Medellín' })
  @IsString()
  @IsNotEmpty()
  city!: string;

  @ApiProperty({
    enum: ExperienceCategoryEnum,
    example: ExperienceCategoryEnum.TRANSPORTATION,
  })
  @IsEnum(ExperienceCategoryEnum)
  category!: ExperienceCategoryEnum;

  @ApiProperty({ example: 120000, minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  priceCop!: number;

  @ApiPropertyOptional({
    example: 2,
    minimum: 1,
    default: 1,
    description:
      'Minimum participants required for the experience to take place',
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  minimumParticipants?: number;

  @ApiProperty({ example: 8, minimum: 1 })
  @IsInt()
  @Min(1)
  capacity!: number;

  @ApiProperty({
    enum: ExperienceAvailabilityTypeEnum,
    example: ExperienceAvailabilityTypeEnum.RECURRING,
  })
  @IsEnum(ExperienceAvailabilityTypeEnum)
  availabilityType!: ExperienceAvailabilityTypeEnum;

  @ApiPropertyOptional({ type: () => ExperienceRecurrenceDto })
  @ValidateNested()
  @Type(() => ExperienceRecurrenceDto)
  @IsOptional()
  recurrence?: ExperienceRecurrenceDto;

  @ApiProperty({ example: true })
  @IsBoolean()
  allowStandalonePurchase!: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  allowReservationPurchase!: boolean;

  @ApiPropertyOptional({
    example: ['tenantId/experiences/1234-photo.jpg'],
    description: 'R2 object keys for uploaded media files',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mediaKeys?: string[];
}
