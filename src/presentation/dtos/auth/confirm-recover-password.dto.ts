import { Match } from '@/presentation/common/decorators/match.decorator';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class ConfirmRecoverPasswordDto {
  @ApiProperty({
    example: 'a3e7f8...',
    description: 'Password recovery token from email link',
  })
  @IsString()
  token: string;

  @ApiProperty({
    example: 'NewPass123*',
    description: 'New password',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  newPassword: string;

  @ApiProperty({
    example: 'NewPass123*',
    description: 'Confirm new password',
  })
  @IsString()
  @Match('newPassword', { message: 'Passwords do not match' })
  newPasswordConfirmation: string;
}
