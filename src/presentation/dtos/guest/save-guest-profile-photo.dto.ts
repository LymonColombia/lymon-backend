import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SaveGuestProfilePhotoDto {
  @ApiProperty({
    example: 'guests/65f1.../profile/1719236872000.jpg',
    description: 'R2 key returned by the presigned-url endpoint',
  })
  @IsString()
  @IsNotEmpty()
  key: string;
}
