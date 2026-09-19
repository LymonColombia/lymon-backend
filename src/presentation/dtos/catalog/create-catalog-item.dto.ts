import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { GuestPreferenceCategoryEnum } from '@/domain/guest-preference/value-objects/guest-preference-category.vo';

export class CreateCatalogItemDto {
  @ApiProperty({ enum: GuestPreferenceCategoryEnum })
  @IsEnum(GuestPreferenceCategoryEnum)
  category: GuestPreferenceCategoryEnum;

  @ApiProperty({ example: 'Extra pillows' })
  @IsString()
  @IsNotEmpty()
  label: string;
}
