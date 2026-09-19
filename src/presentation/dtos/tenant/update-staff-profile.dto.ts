import { IsOptional, IsString } from 'class-validator';

export class UpdateStaffProfileDto {
  @IsOptional()
  @IsString()
  fullName?: string;

  @IsOptional()
  @IsString()
  document?: string;
}
