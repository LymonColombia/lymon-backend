import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateSupplierDto {
  @ApiPropertyOptional({ example: 'Fresh Supplies Inc.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: 'contact@freshsupplies.com' })
  @IsOptional()
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(120)
  contactEmail?: string;

  @ApiPropertyOptional({ example: '+12025550123' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  contactPhone?: string;

  @ApiPropertyOptional({ example: 'Colombia' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  country?: string;

  @ApiPropertyOptional({ example: 'Bogotá' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  city?: string;

  @ApiPropertyOptional({ example: 'NIT-123456789' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  nit?: string;
}
