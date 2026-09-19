import { IsDateString, IsOptional, IsString } from 'class-validator';

export class GetShiftsDto {
  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;

  @IsOptional()
  @IsString()
  propertyId?: string;
}
