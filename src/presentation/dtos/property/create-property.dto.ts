import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsNumber,
  Min,
  Max,
  IsEmail,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { PropertyTypeEnum } from '@/domain/property/value-objects/property-type.vo';
import { CancellationPolicyEnum } from '@/domain/property/value-objects/cancellation-policy.vo';

class LocationDto {
  @ApiProperty({
    example: 40.7128,
    description: 'Latitude',
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}

export class CreatePropertyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(PropertyTypeEnum)
  propertyType: PropertyTypeEnum;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsNotEmpty()
  state: string;

  @IsString()
  @IsNotEmpty()
  country: string;

  @IsString()
  @IsNotEmpty()
  zipCode: string;

  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @IsString()
  @IsNotEmpty()
  checkInTime: string;

  @IsString()
  @IsNotEmpty()
  checkOutTime: string;

  @IsEnum(CancellationPolicyEnum)
  cancellationPolicy: CancellationPolicyEnum;

  @IsString()
  @IsNotEmpty()
  hostPhone: string;

  @IsEmail()
  @IsNotEmpty()
  hostEmail: string;

  @ApiProperty({
    required: false,
    example: 'tenantId/properties/1234-photo.jpg',
    description: 'R2 object key for the property image',
  })
  @IsString()
  @IsOptional()
  imageKey?: string;
}
