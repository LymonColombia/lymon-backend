import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Match } from '@/presentation/common/decorators/match.decorator';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'OldPass123*',
    description: 'Current password for verification',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  currentPassword: string;

  @ApiProperty({
    example: 'NewPass123*',
    description: 'New password for verification',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  newPassword: string;

  @ApiProperty({
    example: 'NewPass123*',
    description: 'Confirm new password for verification',
  })
  @IsString()
  @Match('newPassword', { message: 'Passwords do not match' })
  newPasswordConfirmation: string;
}
