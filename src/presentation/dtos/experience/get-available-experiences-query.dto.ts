import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ExperienceCategoryEnum } from '@/domain/experience/value-objects/experience-category.vo';
import { ExperienceScopeEnum } from '@/domain/experience/value-objects/experience-scope.vo';

export class GetAvailableExperiencesQueryDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  propertyId?: string;

  @IsOptional()
  @IsEnum(ExperienceCategoryEnum)
  category?: ExperienceCategoryEnum;

  @IsOptional()
  @IsEnum(ExperienceScopeEnum)
  scope?: ExperienceScopeEnum;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortByPrice?: 'asc' | 'desc';
}
