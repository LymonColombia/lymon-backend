import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { BedTypeEnum } from '@/domain/unit/value-objects/bed-type.vo';

class BedDto {
  @ApiProperty({
    enum: BedTypeEnum,
    example: BedTypeEnum.QUEEN,
    description: 'Type of bed',
  })
  @IsEnum(BedTypeEnum)
  type!: BedTypeEnum;

  @ApiProperty({
    example: 2,
    description: 'Number of beds of this type',
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  count!: number;
}

class BedroomDto {
  @ApiProperty({
    example: 'Master Bedroom',
    description: 'Name of the bedroom',
  })
  @IsString()
  @IsNotEmpty()
  roomName!: string;

  @ApiProperty({ type: [BedDto], description: 'List of beds in this bedroom' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BedDto)
  beds!: BedDto[];
}

class ExternalIdsDto {
  @ApiProperty({
    example: 'airbnb123456',
    description: 'Airbnb listing ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  airbnbId?: string;

  @ApiProperty({
    example: 'booking789012',
    description: 'Booking.com listing ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  bookingId?: string;

  @ApiProperty({
    example: 'vrbo345678',
    description: 'VRBO listing ID',
    required: false,
  })
  @IsString()
  @IsOptional()
  vrboId?: string;
}

export class CreateUnitDto {
  @ApiProperty({
    example: '507f1f77-bcf8-6cd7-9943-901100000000',
    description: 'Property ID to which this unit belongs',
  })
  @IsString()
  @IsNotEmpty()
  propertyId!: string;

  @ApiProperty({ example: 'Deluxe Ocean View Suite', description: 'Unit name' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    example: 'Spacious suite with private balcony and ocean views',
    description: 'Unit description',
  })
  @IsString()
  @IsNotEmpty()
  description!: string;

  @ApiProperty({
    example: 10,
    description: 'Number of identical units available',
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  inventoryCount!: number;

  @ApiProperty({
    example: 4,
    description: 'Maximum number of guests allowed',
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  maxGuests!: number;

  @ApiProperty({
    example: 2,
    description: 'Standard number of guests (base rate)',
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  standardGuests!: number;

  @ApiProperty({
    type: [BedroomDto],
    description: 'List of bedrooms with bed configuration',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BedroomDto)
  bedrooms!: BedroomDto[];

  @ApiProperty({ example: 2, description: 'Number of bathrooms', minimum: 0 })
  @IsNumber()
  @Min(0)
  bathroomsCount!: number;

  @ApiProperty({
    example: false,
    description: 'Whether the unit is a shared space',
  })
  @IsBoolean()
  isShared!: boolean;

  @ApiProperty({
    example: ['WiFi', 'Air Conditioning', 'TV', 'Mini Bar'],
    description: 'List of amenities',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  amenities!: string[];

  @ApiProperty({
    example: 150,
    description: 'Price per night in USD',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  pricePerNight!: number;

  @ApiProperty({
    type: ExternalIdsDto,
    description: 'External OTA listing IDs',
    required: false,
  })
  @ValidateNested()
  @Type(() => ExternalIdsDto)
  @IsOptional()
  externalIds?: ExternalIdsDto;

  @ApiProperty({
    example: ['tenantId/units/1234-photo.jpg'],
    description: 'R2 object keys for uploaded media files',
    type: [String],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mediaKeys?: string[];
}
