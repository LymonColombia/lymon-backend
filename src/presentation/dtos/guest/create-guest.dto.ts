import { Type } from 'class-transformer';
import {
  IsArray,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { GuestPreferenceItemDto } from '@/presentation/dtos/guest/save-guest-preferences.dto';

class GuestIdentityDto {
  @ApiPropertyOptional({ example: 'passport' })
  @IsOptional()
  @IsString()
  documentType?: string;

  @ApiPropertyOptional({ example: 'AB123456' })
  @IsOptional()
  @IsString()
  documentNumber?: string;

  @ApiPropertyOptional({ example: 'US' })
  @IsOptional()
  @IsString()
  countryCode?: string;
}

export class CreateGuestDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  @IsEmail()
  @IsNotEmpty()
  primaryEmail: string;

  @ApiPropertyOptional({ type: GuestIdentityDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GuestIdentityDto)
  identity?: GuestIdentityDto;

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ example: '+12025550123' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ type: [String], example: ['vip'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ type: [GuestPreferenceItemDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GuestPreferenceItemDto)
  preferences?: GuestPreferenceItemDto[];
}
