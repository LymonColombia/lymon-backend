import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { TenantThemeDto } from '@/presentation/dtos/tenant/tenant-theme.dto';

export class UpdateTenantProfileDto {
  @ApiPropertyOptional({
    example: 'Hotel Paradise',
    description: 'Updated name of the tenant business',
  })
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: '+52 55 1234 5678',
    description: 'Business contact phone number',
  })
  @IsOptional()
  @IsString()
  @MinLength(7)
  @MaxLength(30)
  contactPhone?: string | null;

  @ApiPropertyOptional({
    example: 'Av. Reforma 123, Ciudad de México',
    description: 'Physical address of the business',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  address?: string | null;

  @ApiPropertyOptional({
    example: 'Boutique beachfront hotel with 24 rooms.',
    description: 'Free-text description of the business',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @ApiPropertyOptional({
    type: TenantThemeDto,
    description: 'Branding color theme variables',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TenantThemeDto)
  theme?: TenantThemeDto | null;

  @ApiPropertyOptional({
    example: '65f1a1a2b3c4d5e6f7a8b9c2/logos/1700000000000-logo.png',
    description:
      'R2 object key of an uploaded logo (from POST /storage/presigned-url ' +
      'with category "logos"). Send null to remove the current logo.',
  })
  @IsOptional()
  @IsString()
  logoKey?: string | null;
}
