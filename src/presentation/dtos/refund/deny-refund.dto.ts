import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsUUID,
} from 'class-validator';

export class DenyRefundDto {
  @ApiProperty({ example: '64f1a2b3-c4d5-e6f7-a8b9-c0d200000000' })
  @IsUUID()
  @IsNotEmpty()
  refundRequestId: string;
}
