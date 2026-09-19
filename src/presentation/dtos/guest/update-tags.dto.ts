import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class UpdateTagsDto {
  @ApiProperty({
    description: 'Tag arrangement to assign to the guest',
    example: ['VIP', 'Family'],
  })
  @IsArray()
  @IsString({ each: true })
  tags!: string[];
}
