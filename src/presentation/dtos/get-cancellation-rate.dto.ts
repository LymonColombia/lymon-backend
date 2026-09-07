import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsUUID,
} from 'class-validator';

export class GetCancellationRateDto {
  @ApiProperty({ description: 'Guest ID to filter metrics' })
  @IsUUID()
  guestId: string;

  @ApiProperty({ description: 'Start date for filtering metrics' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'End date for filtering metrics' })
  @IsDateString()
  endDate: string;
}
