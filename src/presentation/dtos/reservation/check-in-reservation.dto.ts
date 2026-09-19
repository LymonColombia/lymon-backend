import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, ValidateNested } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TravelerInfoDto } from './submit-check-in-info.dto';

export class CheckInReservationDto {
  @ApiPropertyOptional({ type: [TravelerInfoDto] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => TravelerInfoDto)
  travelers?: TravelerInfoDto[];
}
