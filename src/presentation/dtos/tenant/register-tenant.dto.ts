import {
  IsEmail,
  IsString,
  MinLength,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PlanTypeDto {
  LYMON_ONE = 'LYMON_ONE',
  PLUS = 'LYMON_PLUS',
  PRIME = 'LYMON_PRIME',
  TRIAL = 'TRIAL',
}

export class RegisterTenantDto {
  @ApiProperty({ example: 'Mi Hotel Paradise', minLength: 3, maxLength: 100 })
  @IsString()
  @MinLength(3, { message: 'Tenant name must be at least 3 characters long' })
  @MaxLength(100, { message: 'Tenant name cannot exceed 100 characters' })
  tenantName: string;

  @ApiProperty({ example: 'owner@hotel.com' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @ApiProperty({ example: 'SecurePass123!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty({ enum: PlanTypeDto, example: 'TRIAL' })
  @IsEnum(PlanTypeDto, { message: 'Invalid plan type' })
  planType: string;
}
