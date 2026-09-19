import { type JwtPayload } from '@/application/auth/services/jwt.service';
import { ChangeGuestPasswordCommand } from '@/application/guest-auth/commands/change-guest-password/change-guest-password.command';
import { ChangeGuestPasswordResult } from '@/application/guest-auth/commands/change-guest-password/change-guest-password.handler';
import { UpdateGuestProfilePhotoCommand } from '@/application/guest-auth/commands/update-guest-profile-photo/update-guest-profile-photo.command';
import { UpdateGuestProfilePhotoResult } from '@/application/guest-auth/commands/update-guest-profile-photo/update-guest-profile-photo.handler';
import { GenerateGuestProfilePhotoUrlQuery } from '@/application/guest-auth/queries/generate-guest-profile-photo-url/generate-guest-profile-photo-url.query';
import { GetGuestAccountProfileQuery } from '@/application/guest-auth/queries/get-guest-account-profile/get-guest-account-profile.query';
import { GetGuestAccountProfileResult } from '@/application/guest-auth/queries/get-guest-account-profile/get-guest-account-profile.result';
import { GenerateGuestProfilePhotoUrlResult } from '@/application/guest-auth/queries/generate-guest-profile-photo-url/generate-guest-profile-photo-url.result';
import { type GuestJwtPayload } from '@/application/guest-auth/services/guest-jwt.service';
import { CreateGuestCommand } from '@/application/guest/commands/create-guest.command';
import { CreateGuestResult } from '@/application/guest/commands/create-guest.result';
import { SearchGuestsQuery } from '@/application/guest/queries/search-guests.query';
import { GetGuestByIdQuery } from '@/application/guest/queries/get-guest-by-id/get-guest-by-id.query';
import type { GetGuestByIdResult } from '@/application/guest/queries/get-guest-by-id/get-guest-by-id.result';
import { UpdateGuestProfileCommand } from '@/application/guest/commands/update-guest-profile/update-guest-profile.command';
import { UpdateGuestAccountProfileCommand } from '@/application/guest-auth/commands/update-guest-account-profile/update-guest-account-profile.command';
import { UpdateGuestAccountProfileResult } from '@/application/guest-auth/commands/update-guest-account-profile/update-guest-account-profile.handler';
import { Permission } from '@/domain/role/value-objects/permission.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { CurrentUser } from '@/infrastructure/auth/decorators/current-user.decorator';
import { Public } from '@/infrastructure/auth/decorators/public.decorator';
import { RequirePermission } from '@/infrastructure/auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '@/infrastructure/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '@/infrastructure/auth/guards/permission.guard';
import { CurrentGuest } from '@/infrastructure/guest-auth/decorators/current-guest.decorator';
import { GuestJwtAuthGuard } from '@/infrastructure/guest-auth/guards/guest-jwt-auth.guard';
import { ChangePasswordDto } from '@/presentation/dtos/auth/change-password.dto';
import { CreateGuestDto } from '@/presentation/dtos/guest/create-guest.dto';
import { UpdateGuestProfileDto } from '@/presentation/dtos/guest/update-guest-profile.dto';
import {
  Body,
  Controller,
  Get,
  Patch,
  Param,
  Post,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { GuestProfilePhotoUrlDto } from '@/presentation/dtos/guest/guest-profile-photo-url.dto';
import { SaveGuestProfilePhotoDto } from '@/presentation/dtos/guest/save-guest-profile-photo.dto';
import { UpdateGuestAccountProfileDto } from '@/presentation/dtos/guest/update-guest-account-profile.dto';

@ApiTags('guests')
@ApiBearerAuth('JWT-auth')
@Controller('guests')
export class GuestController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly searchGuestsQuery: SearchGuestsQuery,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.CRM_MANAGE)
  @ApiOperation({ summary: 'Create a new guest for the current tenant' })
  @ApiResponse({ status: 201, description: 'Guest created successfully' })
  @ApiResponse({
    status: 409,
    description: 'A guest with this primary email already exists',
  })
  async create(@CurrentUser() user: JwtPayload, @Body() dto: CreateGuestDto) {
    const result = await this.commandBus.execute<
      CreateGuestCommand,
      CreateGuestResult
    >(
      new CreateGuestCommand(
        user.tenantId,
        dto.fullName,
        dto.primaryEmail,
        dto.identity,
        dto.firstName,
        dto.lastName,
        dto.phone,
        dto.tags,
        dto.preferences?.map((p) => p.catalogItemId),
      ),
    );

    return {
      message: 'Guest created successfully',
      data: {
        guestId: result.guestId,
      },
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.CRM_VIEW)
  @ApiOperation({ summary: 'List all guests for the current tenant' })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Search by name, email, document number or phone',
  })
  @ApiResponse({ status: 200, description: 'Guests retrieved successfully' })
  async getAll(@CurrentUser() user: JwtPayload, @Query('q') term = '') {
    const { guests, total } = await this.searchGuestsQuery.execute(
      TenantId.createFromString(user.tenantId),
      term,
      1,
      1000,
      'createdAt',
      'desc',
    );

    return {
      message: 'Guests retrieved successfully',
      data: guests.map((guest) => ({
        id: guest.getId()?.toString() ?? '',
        fullName: guest.getFullName(),
        firstName: guest.getFirstName(),
        lastName: guest.getLastName(),
        primaryEmail: guest.getPrimaryEmail(),
        phone: guest.getPhone(),
        status: guest.getStatus(),
        tags: guest.getTags().map((t) => t.getName()),
        createdAt: guest.getCreatedAt(),
        updatedAt: guest.getUpdatedAt(),
      })),
      total,
    };
  }

  @Public()
  @UseGuards(GuestJwtAuthGuard)
  @Patch('change-password')
  @ApiBearerAuth('GuestJWT-auth')
  @ApiOperation({ summary: 'Change password from guest profile' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 401, description: 'Current password is incorrect' })
  @ApiResponse({
    status: 400,
    description: 'New password cannot be the same as the current password',
  })
  async changePassword(
    @CurrentGuest() guest: GuestJwtPayload,
    @Body() dto: ChangePasswordDto,
  ) {
    const result = await this.commandBus.execute<
      ChangeGuestPasswordCommand,
      ChangeGuestPasswordResult
    >(
      new ChangeGuestPasswordCommand(
        guest.guestAccountId,
        dto.currentPassword,
        dto.newPassword,
      ),
    );

    return { message: result.message };
  }

  @Public()
  @UseGuards(GuestJwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth('GuestJWT-auth')
  @ApiOperation({ summary: 'Get the authenticated guest account profile' })
  @ApiResponse({ status: 200, description: 'Guest profile returned' })
  async getProfile(@CurrentGuest() guest: GuestJwtPayload) {
    const result = await this.queryBus.execute<
      GetGuestAccountProfileQuery,
      GetGuestAccountProfileResult
    >(new GetGuestAccountProfileQuery(guest.guestAccountId));

    return {
      message: 'Guest profile returned',
      data: {
        guestAccountId: result.guestAccountId,
        email: result.email,
        fullName: result.fullName,
        firstName: result.firstName,
        lastName: result.lastName,
        emailVerified: result.emailVerified,
        profilePhotoUrl: result.profilePhotoUrl,
      },
    };
  }

  @Public()
  @UseGuards(GuestJwtAuthGuard)
  @Post('profile-photo/presigned-url')
  @ApiBearerAuth('GuestJWT-auth')
  @ApiOperation({
    summary: 'Get a presigned R2 URL to upload the guest profile photo',
  })
  @ApiResponse({ status: 201, description: 'Presigned URL generated' })
  @ApiResponse({ status: 400, description: 'Unsupported image type' })
  async getProfilePhotoUploadUrl(
    @CurrentGuest() guest: GuestJwtPayload,
    @Body() dto: GuestProfilePhotoUrlDto,
  ) {
    const result = await this.queryBus.execute<
      GenerateGuestProfilePhotoUrlQuery,
      GenerateGuestProfilePhotoUrlResult
    >(
      new GenerateGuestProfilePhotoUrlQuery(
        guest.guestAccountId,
        dto.contentType,
        dto.fileSize,
      ),
    );

    return {
      message: 'Presigned URL generated',
      data: {
        presignedUrl: result.presignedUrl,
        fileUrl: result.fileUrl,
        key: result.key,
      },
    };
  }

  @Public()
  @UseGuards(GuestJwtAuthGuard)
  @Post('profile-photo')
  @ApiBearerAuth('GuestJWT-auth')
  @ApiOperation({
    summary: 'Save the uploaded profile photo and remove the previous one',
  })
  @ApiResponse({
    status: 201,
    description: 'Profile photo updated successfully',
  })
  @ApiResponse({ status: 400, description: 'Invalid profile photo key' })
  async saveProfilePhoto(
    @CurrentGuest() guest: GuestJwtPayload,
    @Body() dto: SaveGuestProfilePhotoDto,
  ) {
    const result = await this.commandBus.execute<
      UpdateGuestProfilePhotoCommand,
      UpdateGuestProfilePhotoResult
    >(new UpdateGuestProfilePhotoCommand(guest.guestAccountId, dto.key));

    return {
      message: 'Profile photo updated successfully',
      data: { profilePhotoUrl: result.profilePhotoUrl },
    };
  }

  @Public()
  @UseGuards(GuestJwtAuthGuard)
  @Patch('profile')
  @ApiBearerAuth('GuestJWT-auth')
  @ApiOperation({ summary: "Update the authenticated guest's own profile" })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  @ApiResponse({
    status: 409,
    description: 'An account with this email already exists',
  })
  async updateOwnProfile(
    @CurrentGuest() guest: GuestJwtPayload,
    @Body() dto: UpdateGuestAccountProfileDto,
  ) {
    const result = await this.commandBus.execute<
      UpdateGuestAccountProfileCommand,
      UpdateGuestAccountProfileResult
    >(
      new UpdateGuestAccountProfileCommand(
        guest.guestAccountId,
        dto.firstName,
        dto.lastName,
        dto.phone,
        dto.email,
      ),
    );

    return { message: result.message };
  }

  @Get(':guestId')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.CRM_VIEW)
  @ApiOperation({ summary: 'Get complete profile of a guest by ID' })
  @ApiResponse({
    status: 200,
    description: 'Guest profile retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Guest not found' })
  async getById(
    @CurrentUser() user: JwtPayload,
    @Param('guestId') guestId: string,
  ) {
    const result = await this.queryBus.execute<
      GetGuestByIdQuery,
      GetGuestByIdResult
    >(new GetGuestByIdQuery(user.tenantId, guestId));

    if (!result.item) {
      throw new NotFoundException('Guest not found');
    }

    return {
      message: 'Guest profile retrieved successfully',
      data: result.item,
    };
  }

  @Patch(':guestId')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.CRM_MANAGE)
  @ApiOperation({ summary: 'Update profile fields of a specific guest' })
  @ApiResponse({
    status: 200,
    description: 'Guest profile updated successfully',
  })
  @ApiResponse({ status: 404, description: 'Guest not found' })
  @ApiResponse({
    status: 409,
    description: 'A guest with this primary email already exists',
  })
  async updateProfile(
    @CurrentUser() user: JwtPayload,
    @Param('guestId') guestId: string,
    @Body() dto: UpdateGuestProfileDto,
  ) {
    await this.commandBus.execute(
      new UpdateGuestProfileCommand(
        user.tenantId,
        guestId,
        dto.fullName,
        dto.firstName,
        dto.lastName,
        dto.primaryEmail,
        dto.phone,
        dto.identity,
      ),
    );

    return { message: 'Guest profile updated successfully' };
  }
}
