import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class UpdateInventoryItemDto {
  @ApiPropertyOptional({ example: 'Soap Bar Premium' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '6650a1b2-c3d4-e5f6-a7b8-c9d000000000' })
  @IsOptional()
  @IsString()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'piece' })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({ example: 30, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  minStock?: number;

  @ApiPropertyOptional({ example: 50, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  currentStock?: number;
}
