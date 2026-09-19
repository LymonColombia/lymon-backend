import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsString, Max, Min } from 'class-validator';
import {
  ALLOWED_IMAGE_CONTENT_TYPES,
  MAX_IMAGE_SIZE_BYTES,
} from '@/application/storage/image-upload.constants';

export class GuestProfilePhotoUrlDto {
  @ApiProperty({
    example: 'image/jpeg',
    enum: ALLOWED_IMAGE_CONTENT_TYPES,
  })
  @IsString()
  @IsIn(ALLOWED_IMAGE_CONTENT_TYPES)
  contentType: string;

  @ApiProperty({ example: 102400, description: 'File size in bytes' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_IMAGE_SIZE_BYTES, { message: 'File exceeds the 5 MB maximum' })
  fileSize: number;
}
