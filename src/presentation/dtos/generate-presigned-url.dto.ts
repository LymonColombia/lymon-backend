import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsString, Max, MaxLength, Min } from 'class-validator';
import { MediaCategory } from '@/application/storage/media-category.enum';
import {
  ALLOWED_IMAGE_CONTENT_TYPES,
  MAX_IMAGE_SIZE_BYTES,
} from '@/application/storage/image-upload.constants';

export class GeneratePresignedUrlDto {
  @ApiProperty({ example: 'photo.jpg' })
  @IsString()
  @MaxLength(255)
  fileName: string;

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

  @ApiProperty({ enum: MediaCategory, example: MediaCategory.Experiences })
  @IsEnum(MediaCategory)
  category: MediaCategory;
}
