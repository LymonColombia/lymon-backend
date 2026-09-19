import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { GuestNoteTypeEnum } from '@/domain/guest-note/value-objects/guest-node-type.vo';

export class UpdateGuestNoteDto {
  @ApiPropertyOptional({
    example: 'Guest requested extra towels at check-in',
    description: 'Updated note content',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  note?: string;

  @ApiPropertyOptional({
    enum: GuestNoteTypeEnum,
    example: GuestNoteTypeEnum.PREFERENCE,
    description: 'Updated note category',
  })
  @IsOptional()
  @IsEnum(GuestNoteTypeEnum)
  type?: GuestNoteTypeEnum;
}
