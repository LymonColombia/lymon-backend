import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TravelerInfoDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: 'passport' })
  @IsString()
  @IsNotEmpty()
  documentType: string;

  @ApiProperty({ example: 'AB123456' })
  @IsString()
  @IsNotEmpty()
  documentNumber: string;

  @ApiProperty({ example: 'US' })
  @IsString()
  @IsNotEmpty()
  nationality: string;

  @ApiPropertyOptional({ example: '1990-05-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: '+12025550123' })
  @IsOptional()
  @IsString()
  phone?: string;
}

export class SubmitCheckInInfoDto {
  @ApiProperty({ type: [TravelerInfoDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TravelerInfoDto)
  travelers: TravelerInfoDto[];
}
