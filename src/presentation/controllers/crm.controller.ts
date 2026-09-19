import { type JwtPayload } from '@/application/auth/services/jwt.service';
import { SearchGuestsQuery } from '@/application/guest/queries/search-guests.query';
import { Permission } from '@/domain/role/value-objects/permission.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { CurrentUser } from '@/infrastructure/auth/decorators/current-user.decorator';
import { RequirePermission } from '@/infrastructure/auth/decorators/require-permission.decorator';
import { PermissionGuard } from '@/infrastructure/auth/guards/permission.guard';
import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AssignGuestTagsCommand } from '@/application/guest/commands/assign-guest-tags.command';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateGuestNoteCommand } from '@/application/guest-note/commands/create-guest-note.command';
import { CreateGuestNoteResult } from '@/application/guest-note/commands/create-guest-note.result';
import { UpdateGuestNoteCommand } from '@/application/guest-note/commands/update-guest-note.command';
import { DeleteGuestNoteCommand } from '@/application/guest-note/commands/delete-guest-note.command';
import { TogglePinGuestNoteCommand } from '@/application/guest-note/commands/toggle-pin-guest-note.command';
import { GetGuestNotesByGuestIdQuery } from '@/application/guest-note/queries/get-guest-notes-by-guest-id/get-guest-notes-by-guest-id.query';
import { GetGuestNotesByGuestIdResult } from '@/application/guest-note/queries/get-guest-notes-by-guest-id/get-guest-notes-by-guest-id.result';
import { GetGuestBookingsQuery } from '@/application/guest/queries/get-guest-bookings/get-guest-bookings.query';
import { GetGuestBookingsResult } from '@/application/guest/queries/get-guest-bookings/get-guest-bookings.result';
import { GetGuestMonthlySpendingQuery } from '@/application/guest/queries/get-guest-monthly-spending/get-guest-monthly-spending.query';
import { GetGuestMonthlySpendingResult } from '@/application/guest/queries/get-guest-monthly-spending/get-guest-monthly-spending.result';
import { GetGuestBookingOriginsQuery } from '@/application/guest/queries/get-guest-booking-origins/get-guest-booking-origins.query';
import { GetGuestBookingOriginsResult } from '@/application/guest/queries/get-guest-booking-origins/get-guest-booking-origins.result';
import {
  GetGuestStatsQuery,
  GUEST_STAT_KEYS,
  type GuestStatKey,
} from '@/application/guest/queries/get-guest-stats/get-guest-stats.query';
import { SaveGuestPreferencesCommand } from '@/application/guest/commands/preferences/save-guest-preferences.command';
import { SaveGuestPreferencesResult } from '@/application/guest/commands/preferences/save-guest-preferences.result';
import { GetGuestEmailsByGuestIdQuery } from '@/application/guest-email/queries/get-guest-emails-by-guest-id/get-guest-emails-by-guest-id.query';
import { GetGuestEmailsByGuestIdResult } from '@/application/guest-email/queries/get-guest-emails-by-guest-id/get-guest-emails-by-guest-id.result';
import { SendGuestMessageCommand } from '@/application/guest-message/commands/send-guest-message/send-guest-message.command';
import { GetGuestMessagesByGuestIdQuery } from '@/application/guest-message/queries/get-guest-messages-by-guest-id/get-guest-messages-by-guest-id.query';
import { GetGuestMessagesByGuestIdResult } from '@/application/guest-message/queries/get-guest-messages-by-guest-id/get-guest-messages-by-guest-id.result';
import { GetGuestMessageByIdQuery } from '@/application/guest-message/queries/get-guest-message-by-id/get-guest-message-by-id.query';
import { GuestMessageDetailDto } from '@/application/guest-message/queries/get-guest-message-by-id/get-guest-message-by-id.result';
import { ListCatalogItemsByTenantQuery } from '@/application/guest-preference/queries/list-catalog-items-by-tenant/list-catalog-items-by-tenant.query';
import { ListCatalogItemsByTenantResult } from '@/application/guest-preference/queries/list-catalog-items-by-tenant/list-catalog-items-by-tenant.result';
import { ToggleCatalogItemCommand } from '@/application/guest-preference/commands/toggle-catalog-item/toggle-catalog-item.command';
import { CreateCustomCatalogItemCommand } from '@/application/guest-preference/commands/create-custom-catalog-item/create-custom-catalog-item.command';
import { UpdateCustomCatalogItemCommand } from '@/application/guest-preference/commands/update-custom-catalog-item/update-custom-catalog-item.command';
import { DeleteCustomCatalogItemCommand } from '@/application/guest-preference/commands/delete-custom-catalog-item/delete-custom-catalog-item.command';
import { CreateGuestNoteDto } from '@/presentation/dtos/guest-note/create-guest-note.dto';
import { UpdateGuestNoteDto } from '@/presentation/dtos/guest-note/update-guest-note.dto';
import { SendGuestMessageDto } from '@/presentation/dtos/guest/send-guest-message.dto';
import { CreateCatalogItemDto } from '@/presentation/dtos/catalog/create-catalog-item.dto';
import { UpdateCatalogItemDto } from '@/presentation/dtos/catalog/update-catalog-item.dto';
import { ToggleCatalogItemDto } from '@/presentation/dtos/catalog/toggle-catalog-item.dto';
import { GetConversationsByTenantQuery } from '@/application/conversation/queries/get-conversations-by-tenant/get-conversations-by-tenant.query';
import { GetConversationThreadQuery } from '@/application/conversation/queries/get-conversation-thread/get-conversation-thread.query';
import { MarkConversationReadCommand } from '@/application/conversation/commands/mark-conversation-read/mark-conversation-read.command';
import { ArchiveConversationCommand } from '@/application/conversation/commands/archive-conversation/archive-conversation.command';
import { GetGuestRatingsQuery } from '@/application/unit-rating/queries/get-guest-ratings/get-guest-ratings.query';
import { GetGuestRatingsResult } from '@/application/unit-rating/queries/get-guest-ratings/get-guest-ratings.result';
import { GetGuestLifecycleStatusQuery } from '@/application/guest/queries/get-guest-lifecycle-status/get-guest-lifecycle-status.query';
import { GuestLifecycleStatus } from '@/domain/guest/value-objects/guest-lifecycle-status.vo';
import { SaveGuestPreferencesDto } from '@/presentation/dtos/guest/save-guest-preferences.dto';

@ApiTags('crm')
@ApiBearerAuth('JWT-auth')
@Controller('crm')
export class CrmController {
  constructor(
    private readonly searchGuestsQuery: SearchGuestsQuery,
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('guests')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.CRM_VIEW)
  @ApiOperation({
    summary: 'List all tenant guests for CRM ordered by creation date desc',
  })
  @ApiResponse({
    status: 200,
    description: 'CRM guests retrieved successfully',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['createdAt', 'fullName', 'status'],
  })
  @ApiQuery({ name: 'sortDirection', required: false, enum: ['asc', 'desc'] })
  async getGuests(
    @CurrentUser() user: JwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('sortBy') sortBy: 'createdAt' | 'fullName' | 'status' = 'createdAt',
    @Query('sortDirection') sortDirection: 'asc' | 'desc' = 'desc',
  ) {
    const { guests, total } = await this.searchGuestsQuery.execute(
      TenantId.createFromString(user.tenantId),
      '',
      page,
      limit,
      sortBy,
      sortDirection,
    );

    const guestIds = guests.map((guest) => guest.getId()?.toString()).filter(Boolean) as string[];

    const lifecycleStatuses = await this.queryBus.execute<
      GetGuestLifecycleStatusQuery,
      Map<string, GuestLifecycleStatus>
    >(new GetGuestLifecycleStatusQuery(user.tenantId, guestIds));

    return {
      message: 'CRM guests retrieved successfully',
      data: {
        items: guests.map((guest) => {
          const currentId = guest.getId()?.toString() || '';
          
          return {
            guestId: currentId,
            fullName: guest.getFullName(),
            primaryEmail: guest.getPrimaryEmail(),
            phone: guest.getPhone(),
            status: guest.getStatus(),
            tags: guest.getTags().map((t) => t.getName()),
            lifecycleStatus: lifecycleStatuses.get(currentId) || GuestLifecycleStatus.NO_RESERVATION,
          };
        }),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
    };
  }

  @Post('guests/:guestId/notes')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.CRM_MANAGE)
  @ApiOperation({
    summary: 'Add internal note to a guest',
  })
  @ApiResponse({
    status: 201,
    description: 'Internal note added successfully',
  })
  async addGuestNote(
    @Param('guestId') guestId: string,
    @Body() dto: CreateGuestNoteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.commandBus.execute<
      CreateGuestNoteCommand,
      CreateGuestNoteResult
    >(
      new CreateGuestNoteCommand(
        user.tenantId,
        guestId,
        dto.note,
        dto.type,
        user.userId,
        user.email,
        dto.status,
      ),
    );

    return {
      message: 'Internal note added successfully',
      data: result,
    };
  }

  @Patch('guests/:guestId/notes/:noteId')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.CRM_MANAGE)
  @ApiOperation({ summary: 'Edit a guest note' })
  @ApiResponse({ status: 200, description: 'Guest note updated successfully' })
  @ApiResponse({
    status: 400,
    description: 'No fields provided or invalid type',
  })
  @ApiResponse({ status: 404, description: 'Guest note not found' })
  async updateGuestNote(
    @Param('noteId') noteId: string,
    @Body() dto: UpdateGuestNoteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.commandBus.execute<UpdateGuestNoteCommand, void>(
      new UpdateGuestNoteCommand(
        user.tenantId,
        noteId,
        user.userId,
        user.email,
        dto.note,
        dto.type,
      ),
    );
    return { message: 'Guest note updated successfully' };
  }

  @Delete('guests/:guestId/notes/:noteId')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.CRM_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete a guest note' })
  @ApiResponse({ status: 204, description: 'Guest note deleted successfully' })
  @ApiResponse({ status: 404, description: 'Guest note not found' })
  async deleteGuestNote(
    @Param('noteId') noteId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.commandBus.execute<DeleteGuestNoteCommand, void>(
      new DeleteGuestNoteCommand(user.tenantId, noteId, user.userId, user.email),
    );
  }

  @Patch('guests/:guestId/notes/:noteId/pin')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.CRM_MANAGE)
  @ApiOperation({ summary: 'Toggle pin/unpin on a guest note' })
  @ApiResponse({ status: 200, description: 'Guest note pin status toggled' })
  @ApiResponse({ status: 404, description: 'Guest note not found' })
  async togglePinGuestNote(
    @Param('noteId') noteId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.commandBus.execute<TogglePinGuestNoteCommand, void>(
      new TogglePinGuestNoteCommand(user.tenantId, noteId, user.userId, user.email),
    );
    return { message: 'Guest note pin status toggled' };
  }

  @Get('guests/:guestId/notes')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.CRM_VIEW)
  @ApiOperation({
    summary: 'Get all internal notes for a guest',
  })
  @ApiResponse({
    status: 200,
    description: 'Guest notes retrieved successfully',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getGuestNotes(
    @Param('guestId') guestId: string,
    @CurrentUser() user: JwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const result = await this.queryBus.execute<
      GetGuestNotesByGuestIdQuery,
      GetGuestNotesByGuestIdResult
    >(new GetGuestNotesByGuestIdQuery(user.tenantId, guestId, page, limit));

    return {
      message: 'Guest notes retrieved successfully',
      data: {
        items: result.items,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      },
    };
  }

  @Get('guests/:guestId/bookings')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.CRM_VIEW)
  @ApiOperation({
    summary: 'Get reservation history for a guest',
  })
  @ApiResponse({
    status: 200,
    description: 'Guest bookings retrieved successfully',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['checkIn', 'createdAt'],
  })
  @ApiQuery({ name: 'sortDirection', required: false, enum: ['asc', 'desc'] })
  async getGuestBookings(
    @Param('guestId') guestId: string,
    @CurrentUser() user: JwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('sortBy') sortBy: 'checkIn' | 'createdAt' = 'checkIn',
    @Query('sortDirection') sortDirection: 'asc' | 'desc' = 'desc',
  ) {
    const result = await this.queryBus.execute<
      GetGuestBookingsQuery,
      GetGuestBookingsResult
    >(
      new GetGuestBookingsQuery(
        user.tenantId,
        guestId,
        page,
        limit,
        sortBy,
        sortDirection,
      ),
    );

    return {
      message: 'Guest bookings retrieved successfully',
      data: {
        items: result.items,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      },
    };
  }

  @Get('guests/:guestId/spending/monthly')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.CRM_VIEW)
  @ApiOperation({ summary: 'Get monthly spending breakdown for a guest (last 12 rolling months)' })
  @ApiResponse({
    status: 200,
    description: 'Guest monthly spending retrieved successfully',
  })
  async getGuestMonthlySpending(
    @Param('guestId') guestId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.queryBus.execute<
      GetGuestMonthlySpendingQuery,
      GetGuestMonthlySpendingResult
    >(new GetGuestMonthlySpendingQuery(user.tenantId, guestId));
    return {
      message: 'Guest monthly spending retrieved successfully',
      data: result.items,
    };
  }

  @Get('guests/:guestId/booking-origins')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.CRM_VIEW)
  @ApiOperation({ summary: 'Get booking source distribution for a guest' })
  @ApiResponse({
    status: 200,
    description: 'Guest booking origins retrieved successfully',
  })
  async getGuestBookingOrigins(
    @Param('guestId') guestId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.queryBus.execute<
      GetGuestBookingOriginsQuery,
      GetGuestBookingOriginsResult
    >(new GetGuestBookingOriginsQuery(user.tenantId, guestId));

    return {
      message: 'Guest booking origins retrieved successfully',
      data: {
        total: result.total,
        sources: result.sources,
      },
    };
  }

  @Get('guests/:guestId/stats')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.CRM_VIEW)
  @ApiOperation({
    summary:
      'Get guest stats. Pass ?include=monthlySpending,bookingOrigins to select a subset; omit to return all.',
  })
  @ApiQuery({
    name: 'include',
    required: false,
    description: 'Comma-separated stat keys. Unknown keys are ignored.',
  })
  @ApiResponse({ status: 200, description: 'Guest stats retrieved successfully' })
  async getGuestStats(
    @Param('guestId') guestId: string,
    @CurrentUser() user: JwtPayload,
    @Query('include') include?: string,
  ) {
    // ponytail: unknown keys silently dropped; empty include => all. Add 400 if FE needs strictness.
    const requested = include
      ? (include.split(',').map((s) => s.trim()) as string[]).filter(
          (s): s is GuestStatKey => (GUEST_STAT_KEYS as string[]).includes(s),
        )
      : GUEST_STAT_KEYS;

    const data = await this.queryBus.execute<
      GetGuestStatsQuery,
      Record<string, unknown>
    >(new GetGuestStatsQuery(user.tenantId, guestId, requested));

    return {
      message: 'Guest stats retrieved successfully',
      data,
    };
  }

  @Patch('guests/:guestId/tags')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.CRM_MANAGE)
  @ApiOperation({ summary: 'Assign tags to a guest' })
  @ApiResponse({
    status: 200,
    description: 'Tags assigned successfully',
  })
  async assignTags(
    @Param('guestId') guestId: string,
    @Body('tags') tags: string[],
    @CurrentUser() user: JwtPayload,
  ) {
    await this.commandBus.execute(
      new AssignGuestTagsCommand(guestId, tags, user.tenantId, user.userId, user.email),
    );

    return {
      message: 'Tags assigned successfully',
    };
  }

  @Patch('guests/:guestId/preferences')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.CRM_MANAGE)
  @ApiOperation({ summary: 'Update free-text preference notes for a guest' })
  @ApiResponse({
    status: 200,
    description: 'Guest preferences updated successfully',
  })
  @ApiResponse({
    status: 403,
    description:
      'Plan does not allow guest preferences management or insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Guest not found' })
  async updatePreferences(
    @Param('guestId') guestId: string,
    @Body() dto: SaveGuestPreferencesDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.commandBus.execute<
      SaveGuestPreferencesCommand,
      SaveGuestPreferencesResult
    >(
      new SaveGuestPreferencesCommand(
        user.tenantId,
        guestId,
        dto.preferences.map((p) => p.catalogItemId),
        user.activePlan,
        user.userId,
        user.email,
      ),
    );

    return {
      message: 'Guest preferences updated successfully',
      data: { guestId: result.guestId, wasCreated: result.wasCreated },
    };
  }

  @Get('guests/:guestId/emails')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.CRM_VIEW)
  @ApiOperation({
    summary: 'Get communication history (emails) for a guest',
  })
  @ApiResponse({
    status: 200,
    description: 'Guest emails retrieved successfully',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getGuestEmails(
    @Param('guestId') guestId: string,
    @CurrentUser() user: JwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const result = await this.queryBus.execute<
      GetGuestEmailsByGuestIdQuery,
      GetGuestEmailsByGuestIdResult
    >(new GetGuestEmailsByGuestIdQuery(user.tenantId, guestId, page, limit));

    return {
      message: 'Guest communication history retrieved successfully',
      data: {
        items: result.items,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      },
    };
  }

  @Get('guests/:guestId/ratings')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.CRM_VIEW)
  @ApiOperation({ summary: 'Get all ratings given by a guest' })
  @ApiResponse({
    status: 200,
    description: 'Guest ratings retrieved successfully',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getGuestRatings(
    @Param('guestId') guestId: string,
    @CurrentUser() user: JwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    const result = await this.queryBus.execute<
      GetGuestRatingsQuery,
      GetGuestRatingsResult
    >(new GetGuestRatingsQuery(user.tenantId, guestId, page, limit));

    return {
      message: 'Guest ratings retrieved successfully',
      data: {
        items: result.ratings,
        averageRating: result.averageRating,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      },
    };
  }

  @Post('guests/:guestId/messages')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.CRM_MANAGE)
  @ApiOperation({
    summary: 'Send an email or message to a guest',
  })
  @ApiResponse({
    status: 201,
    description: 'Message sent and recorded successfully',
  })
  async sendGuestMessage(
    @Param('guestId') guestId: string,
    @CurrentUser() user: JwtPayload,
    @Body() dto: SendGuestMessageDto,
  ) {
    const result = await this.commandBus.execute<
      SendGuestMessageCommand,
      { id: string }
    >(
      new SendGuestMessageCommand(
        user.tenantId,
        guestId,
        dto.subject,
        dto.body,
        dto.templateId,
        dto.attachments,
        user.userId,
        user.email,
      ),
    );

    return {
      message: 'Message sent and recorded successfully',
      data: result,
    };
  }

  @Get('guests/:guestId/messages')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.CRM_VIEW)
  @ApiOperation({
    summary: 'Get paginated message history for a guest (preview only, no body)',
  })
  @ApiResponse({
    status: 200,
    description: 'Guest messages retrieved successfully',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getGuestMessages(
    @Param('guestId') guestId: string,
    @CurrentUser() user: JwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    const result = await this.queryBus.execute<
      GetGuestMessagesByGuestIdQuery,
      GetGuestMessagesByGuestIdResult
    >(new GetGuestMessagesByGuestIdQuery(user.tenantId, guestId, page, limit));

    return {
      message: 'Guest messages retrieved successfully',
      data: {
        items: result.items,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages,
        },
      },
    };
  }

  @Get('guests/:guestId/messages/:messageId')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.CRM_VIEW)
  @ApiOperation({
    summary: 'Get a single guest message with provider-resolved body',
  })
  @ApiResponse({
    status: 200,
    description: 'Guest message retrieved successfully',
  })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async getGuestMessageById(
    @Param('guestId') guestId: string,
    @Param('messageId') messageId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.queryBus.execute<
      GetGuestMessageByIdQuery,
      GuestMessageDetailDto
    >(new GetGuestMessageByIdQuery(user.tenantId, guestId, messageId));

    return {
      message: 'Guest message retrieved successfully',
      data: result,
    };
  }

  // ── Catalog endpoints ────────────────────────────────────────────────────────

  @Get('catalog')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.CRM_VIEW)
  @ApiOperation({ summary: 'List preference catalog items for the tenant' })
  @ApiResponse({
    status: 200,
    description: 'Catalog items retrieved successfully',
  })
  async listCatalogItems(
    @CurrentUser() user: JwtPayload,
    @Query('includeInactive', new DefaultValuePipe(false), ParseBoolPipe)
    includeInactive: boolean,
  ) {
    const result = await this.queryBus.execute<
      ListCatalogItemsByTenantQuery,
      ListCatalogItemsByTenantResult
    >(new ListCatalogItemsByTenantQuery(user.tenantId, includeInactive));

    return {
      message: 'Catalog items retrieved successfully',
      data: result.items,
    };
  }

  @Patch('catalog/:itemId/toggle')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.CRM_MANAGE)
  @ApiOperation({ summary: 'Activate or deactivate a catalog item' })
  @ApiResponse({
    status: 200,
    description: 'Catalog item toggled successfully',
  })
  @ApiResponse({ status: 404, description: 'Catalog item not found' })
  async toggleCatalogItem(
    @Param('itemId') itemId: string,
    @Body() dto: ToggleCatalogItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.commandBus.execute(
      new ToggleCatalogItemCommand(user.tenantId, itemId, dto.activate, user.userId, user.email),
    );

    return { message: 'Catalog item toggled successfully' };
  }

  @Post('catalog')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.CRM_MANAGE)
  @ApiOperation({ summary: 'Create a custom catalog item' })
  @ApiResponse({
    status: 201,
    description: 'Catalog item created successfully',
  })
  @ApiResponse({
    status: 403,
    description: 'Plan does not allow custom catalog items',
  })
  async createCatalogItem(
    @Body() dto: CreateCatalogItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    const itemId = await this.commandBus.execute<
      CreateCustomCatalogItemCommand,
      string
    >(
      new CreateCustomCatalogItemCommand(
        user.tenantId,
        user.activePlan,
        dto.category,
        dto.label,
        user.userId,
        user.email,
      ),
    );

    return {
      message: 'Catalog item created successfully',
      data: { itemId },
    };
  }

  @Patch('catalog/:itemId')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.CRM_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a custom catalog item' })
  @ApiResponse({
    status: 200,
    description: 'Catalog item updated successfully',
  })
  @ApiResponse({
    status: 403,
    description:
      'Plan does not allow custom catalog management or item is not custom',
  })
  @ApiResponse({ status: 404, description: 'Catalog item not found' })
  async updateCatalogItem(
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCatalogItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.commandBus.execute(
      new UpdateCustomCatalogItemCommand(
        user.tenantId,
        user.activePlan,
        itemId,
        dto.label,
        dto.category,
        user.userId,
        user.email,
      ),
    );

    return { message: 'Catalog item updated successfully' };
  }

  @Delete('catalog/:itemId')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.CRM_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a custom catalog item' })
  @ApiResponse({
    status: 200,
    description: 'Catalog item deleted successfully',
  })
  @ApiResponse({
    status: 403,
    description:
      'Plan does not allow custom catalog management or item is not custom',
  })
  @ApiResponse({ status: 404, description: 'Catalog item not found' })
  async deleteCatalogItem(
    @Param('itemId') itemId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.commandBus.execute(
      new DeleteCustomCatalogItemCommand(
        user.tenantId,
        user.activePlan,
        itemId,
        user.userId,
        user.email,
      ),
    );

    return { message: 'Catalog item deleted successfully' };
  }

  @Get('conversations')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.CRM_VIEW)
  @ApiOperation({ summary: 'Get staff inbox — paginated conversation list' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'channel', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  async getConversations(
    @CurrentUser() user: JwtPayload,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('channel') channel?: string,
    @Query('status') status?: string,
    @Query('unreadOnly', new DefaultValuePipe(false), ParseBoolPipe) unreadOnly?: boolean,
  ) {
    const result = await this.queryBus.execute(
      new GetConversationsByTenantQuery(user.tenantId, page, limit, channel, status, unreadOnly),
    );
    return {
      message: 'Conversations retrieved successfully',
      data: { items: result.items, pagination: { total: result.total, page: result.page, limit: result.limit, totalPages: result.totalPages } },
    };
  }

  @Get('conversations/:conversationId')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.CRM_VIEW)
  @ApiOperation({ summary: 'Get conversation thread with resolved message bodies' })
  async getConversationThread(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    const result = await this.queryBus.execute(
      new GetConversationThreadQuery(user.tenantId, conversationId),
    );
    return { message: 'Conversation thread retrieved successfully', data: result };
  }

  @Patch('conversations/:conversationId/read')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.CRM_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark conversation as read by staff' })
  async markConversationRead(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.commandBus.execute(
      new MarkConversationReadCommand(user.tenantId, conversationId),
    );
    return { message: 'Conversation marked as read' };
  }

  @Patch('conversations/:conversationId/archive')
  @UseGuards(PermissionGuard)
  @RequirePermission(Permission.CRM_MANAGE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archive a conversation' })
  async archiveConversation(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.commandBus.execute(
      new ArchiveConversationCommand(user.tenantId, conversationId),
    );
    return { message: 'Conversation archived successfully' };
  }
}
