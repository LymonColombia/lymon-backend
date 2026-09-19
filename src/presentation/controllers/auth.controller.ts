import { LoginCommand } from '@/application/auth/commands/login.command';
import { LoginResult } from '@/application/auth/commands/login.handler';
import { RegisterTenantCommand } from '@/application/tenant/commands/register-tenant.command';
import { RegisterTenantResult } from '@/application/tenant/commands/register-tenant.handler';
import { VerifyEmailCommand } from '@/application/user/commands/verify-email/verify-email.command';
import { RecoverPasswordCommand } from '@/application/auth/commands/recover-password.command';
import { RecoverPasswordResult } from '@/application/auth/commands/recover-password.handler';
import { ConfirmRecoverPasswordCommand } from '@/application/auth/commands/confirm-recover-password.command';
import { ConfirmRecoverPasswordResult } from '@/application/auth/commands/confirm-recover-password.handler';
import { Public } from '@/infrastructure/auth/decorators/public.decorator';
import { JwtAuthGuard } from '@/infrastructure/auth/guards/jwt-auth.guard';
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RegisterTenantDto } from '@/presentation/dtos/tenant/register-tenant.dto';
import { LoginDto } from '@/presentation/dtos/auth/login.dto';
import { RefreshTokenDto } from '@/presentation/dtos/auth/refresh-token.dto';
import { RefreshTokenCommand } from '@/application/auth/commands/refresh-token.command';
import { RefreshTokenResult } from '@/application/auth/commands/refresh-token.handler';
import { RecoverPasswordDto } from '@/presentation/dtos/auth/recover-password.dto';
import { ConfirmRecoverPasswordDto } from '@/presentation/dtos/auth/confirm-recover-password.dto';
import { LogoutResult } from '@/application/auth/commands/logout.handler';
import { LogoutCommand } from '@/application/auth/commands/logout.command';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly commandBus: CommandBus) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new tenant with owner account' })
  @ApiResponse({ status: 201, description: 'Registration successful' })
  async register(@Body() dto: RegisterTenantDto) {
    const command = new RegisterTenantCommand(
      dto.tenantName,
      dto.email,
      dto.password,
      dto.planType,
    );

    const result = await this.commandBus.execute<
      RegisterTenantCommand,
      RegisterTenantResult
    >(command);

    return {
      message:
        'Registration successful. Please check your email to verify your account.',
      data: {
        tenantId: result.tenantId,
        userId: result.userId,
        email: result.email,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  async login(@Body() dto: LoginDto) {
    const command = new LoginCommand(dto.email, dto.password);
    const result = await this.commandBus.execute<LoginCommand, LoginResult>(
      command,
    );

    return {
      message: 'Login successful',
      data: {
        userId: result.userId,
        email: result.email,
        tenantId: result.tenantId,
        isOwner: result.isOwner,
        emailVerified: result.emailVerified,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        tutorialCompleted: result.tutorialCompleted,
      },
    };
  }

  @Public()
  @Get('verify-email')
  @ApiOperation({ summary: 'Verify email with JWT token from email' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  async verifyEmail(@Query('token') token: string) {
    const command = new VerifyEmailCommand(token);
    await this.commandBus.execute(command);

    return {
      message: 'Email verified successfully. You can now access all features.',
    };
  }

  @Public()
  @Post('recover-password')
  @ApiOperation({ summary: 'Request password recovery email' })
  @ApiResponse({
    status: 200,
    description: 'Recovery email sent if account exists',
  })
  async recoverPassword(@Body() dto: RecoverPasswordDto) {
    const command = new RecoverPasswordCommand(dto.email);
    const result = await this.commandBus.execute<
      RecoverPasswordCommand,
      RecoverPasswordResult
    >(command);

    return {
      message: result.message,
    };
  }

  @Public()
  @Post('recover-password/confirm')
  @ApiOperation({ summary: 'Confirm password recovery with token' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  async confirmRecoverPassword(@Body() dto: ConfirmRecoverPasswordDto) {
    const command = new ConfirmRecoverPasswordCommand(
      dto.token,
      dto.newPassword,
      dto.newPasswordConfirmation,
    );
    const result = await this.commandBus.execute<
      ConfirmRecoverPasswordCommand,
      ConfirmRecoverPasswordResult
    >(command);

    return {
      message: result.message,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using a valid refresh token' })
  @ApiResponse({ status: 200, description: 'Tokens refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  async refresh(@Body() dto: RefreshTokenDto) {
    const result = await this.commandBus.execute<
      RefreshTokenCommand,
      RefreshTokenResult
    >(new RefreshTokenCommand(dto.refreshToken));

    return {
      message: 'Tokens refreshed successfully',
      data: {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
    };
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'Logout and revoke current refresh token' })
  @ApiResponse({ status: 200, description: 'Logout successful' })
  async logout(@Body() dto: RefreshTokenDto) {
    const result = await this.commandBus.execute<LogoutCommand, LogoutResult>(
      new LogoutCommand(dto.refreshToken),
    );

    return {
      message: result.message,
    };
  }
}
