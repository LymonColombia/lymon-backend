import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class UpdateGuestIdentityDto {
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

export class UpdateGuestProfileDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fullName?: string;

  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @IsString()
  firstName?: string | null;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @IsString()
  lastName?: string | null;

  @ApiPropertyOptional({ example: 'john.doe@example.com' })
  @IsOptional()
  @IsEmail()
  primaryEmail?: string;

  @ApiPropertyOptional({
    example: '+12025550123',
    nullable: true,
    description: 'Send null to clear the phone number.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  phone?: string | null;

  @ApiPropertyOptional({ type: UpdateGuestIdentityDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateGuestIdentityDto)
  identity?: UpdateGuestIdentityDto;
}
