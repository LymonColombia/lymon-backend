import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Fresh Supplies Inc.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'contact@freshsupplies.com' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(120)
  contactEmail: string;

  @ApiProperty({ example: '+12025550123' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  contactPhone: string;

  @ApiProperty({ example: 'Colombia' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  country: string;

  @ApiProperty({ example: 'Bogotá' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  city: string;

  @ApiProperty({ example: 'NIT-123456789' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  nit: string;
}
