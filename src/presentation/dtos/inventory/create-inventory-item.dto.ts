import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateInventoryItemDto {
  @ApiProperty({ example: 'SOAP-001' })
  @IsString()
  @IsNotEmpty()
  sku: string;

  @ApiProperty({ example: 'Soap Bar' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '6650a1b2-c3d4-e5f6-a7b8-c9d000000000' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  categoryId: string;

  @ApiProperty({ example: 'piece' })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiProperty({ example: 20, minimum: 0 })
  @IsInt()
  @Min(0)
  minStock: number;

  @ApiProperty({ example: 150, minimum: 0, required: false })
  @IsOptional()
  @IsInt()
  @Min(0)
  initialStock?: number;
}
