import { IsEmail, IsOptional, IsString, ValidateIf } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateGuestAccountProfileDto {
  @ApiPropertyOptional({ example: 'John' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  firstName?: string | null;

  @ApiPropertyOptional({ example: 'Doe' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  lastName?: string | null;

  @ApiPropertyOptional({
    example: 'john.doe@example.com',
    description: 'Requires re-verification before it takes effect.',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: '+12025550123',
    nullable: true,
    description: 'Send null to clear the phone number.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  phone?: string | null;
}
