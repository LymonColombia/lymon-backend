import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ToggleCatalogItemDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  activate: boolean;
}
