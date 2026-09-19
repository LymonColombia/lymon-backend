import { Type } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CancellationPolicyEnum } from '@/domain/property/value-objects/cancellation-policy.vo';

class UpdatePropertyLocationDto {
  @ApiPropertyOptional({
    example: 40.7128,
    description: 'Latitude',
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiPropertyOptional({
    example: -74.006,
    description: 'Longitude',
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}

export class UpdatePropertyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  zipCode?: string;

  @ApiPropertyOptional({
    type: UpdatePropertyLocationDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdatePropertyLocationDto)
  location?: UpdatePropertyLocationDto;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  checkInTime?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  checkOutTime?: string;

  @ApiPropertyOptional({ enum: CancellationPolicyEnum })
  @IsOptional()
  @IsEnum(CancellationPolicyEnum)
  cancellationPolicy?: CancellationPolicyEnum;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  hostPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @IsNotEmpty()
  hostEmail?: string;

  @ApiPropertyOptional({
    example: 'tenantId/properties/1234-photo.jpg',
    description: 'R2 object key for the property image',
  })
  @IsString()
  @IsOptional()
  imageKey?: string;
}
