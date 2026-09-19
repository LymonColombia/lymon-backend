import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class RecoverGuestPasswordDto {
  @ApiProperty({ example: 'juan@example.com' })
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;
}
