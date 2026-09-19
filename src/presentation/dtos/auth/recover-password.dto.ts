import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class RecoverPasswordDto {
  @ApiProperty({
    example: 'usuario@ejemplo.com',
    description: 'Email address associated with the account',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @IsNotEmpty({ message: 'Email is required' })
  @IsString()
  email: string;
}
