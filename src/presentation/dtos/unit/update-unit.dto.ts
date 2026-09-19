import {
  IsString,
  IsNumber,
  Min,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BedTypeEnum } from '@/domain/unit/value-objects/bed-type.vo';

class UpdateBedDto {
  @ApiPropertyOptional({
    enum: BedTypeEnum,
    example: BedTypeEnum.QUEEN,
    description: 'Type of bed',
  })
  @IsEnum(BedTypeEnum)
  type!: BedTypeEnum;

  @ApiPropertyOptional({
    example: 2,
    description: 'Number of beds of this type',
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  count!: number;
}

class UpdateBedroomDto {
  @ApiPropertyOptional({
    example: 'Master Bedroom',
    description: 'Name of the bedroom',
  })
  @IsString()
  roomName!: string;

  @ApiPropertyOptional({
    type: [UpdateBedDto],
    description: 'List of beds in this bedroom',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateBedDto)
  beds!: UpdateBedDto[];
}

class UpdateExternalIdsDto {
  @ApiPropertyOptional({
    example: 'airbnb123456',
    description: 'Airbnb listing ID',
  })
  @IsString()
  @IsOptional()
  airbnbId?: string;

  @ApiPropertyOptional({
    example: 'booking789012',
    description: 'Booking.com listing ID',
  })
  @IsString()
  @IsOptional()
  bookingId?: string;

  @ApiPropertyOptional({
    example: 'vrbo345678',
    description: 'VRBO listing ID',
  })
  @IsString()
  @IsOptional()
  vrboId?: string;
}

export class UpdateUnitDto {
  @ApiPropertyOptional({ example: 'Deluxe Ocean View Suite' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    example: 'Spacious suite with private balcony and ocean views',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: 10,
    description: 'Number of identical units available',
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  inventoryCount?: number;

  @ApiPropertyOptional({
    example: 4,
    description: 'Maximum number of guests allowed',
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  maxGuests?: number;

  @ApiPropertyOptional({
    example: 2,
    description: 'Standard number of guests (base rate)',
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  standardGuests?: number;

  @ApiPropertyOptional({
    type: [UpdateBedroomDto],
    description: 'List of bedrooms with bed configuration',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateBedroomDto)
  @IsOptional()
  bedrooms?: UpdateBedroomDto[];

  @ApiPropertyOptional({
    example: 2,
    description: 'Number of bathrooms',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  bathroomsCount?: number;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether the unit is a shared space',
  })
  @IsBoolean()
  @IsOptional()
  isShared?: boolean;

  @ApiPropertyOptional({
    example: ['WiFi', 'Air Conditioning', 'TV', 'Mini Bar'],
    description: 'List of amenities',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  amenities?: string[];

  @ApiPropertyOptional({
    example: ['tenantId/1234-photo.jpg'],
    description: 'R2 object keys for uploaded media files',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  mediaKeys?: string[];

  @ApiPropertyOptional({
    example: 150,
    description: 'Price per night in USD',
    minimum: 0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  pricePerNight?: number;

  @ApiPropertyOptional({
    type: UpdateExternalIdsDto,
    description: 'External OTA listing IDs',
  })
  @ValidateNested()
  @Type(() => UpdateExternalIdsDto)
  @IsOptional()
  externalIds?: UpdateExternalIdsDto;
}
