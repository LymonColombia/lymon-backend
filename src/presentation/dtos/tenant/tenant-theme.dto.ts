import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsHexColor, IsOptional } from 'class-validator';

export class TenantThemeDto {
  @ApiPropertyOptional({ example: '#1A73E8' })
  @IsOptional()
  @IsHexColor()
  primary?: string;

  @ApiPropertyOptional({ example: '#34A853' })
  @IsOptional()
  @IsHexColor()
  secondary?: string;

  @ApiPropertyOptional({ example: '#FBBC05' })
  @IsOptional()
  @IsHexColor()
  accent?: string;
}
