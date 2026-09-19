import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { GuestNoteTypeEnum } from '@/domain/guest-note/value-objects/guest-node-type.vo';
import { GuestNoteStatusEnum } from '@/domain/guest-note/value-objects/guest-node-status.vo';

export class CreateGuestNoteDto {
  @ApiProperty({ example: 'Customer broke a glass in the lobby' })
  @IsString()
  @IsNotEmpty()
  note: string;

  @ApiProperty({ enum: GuestNoteTypeEnum, example: GuestNoteTypeEnum.INCIDENT })
  @IsEnum(GuestNoteTypeEnum)
  type: GuestNoteTypeEnum;

  @ApiPropertyOptional({
    enum: GuestNoteStatusEnum,
    example: GuestNoteStatusEnum.NOT_PINNED,
  })
  @IsOptional()
  @IsEnum(GuestNoteStatusEnum)
  status?: GuestNoteStatusEnum;
}
