import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@/infrastructure/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '@/infrastructure/auth/guards/permission.guard';
import { RequirePermission } from '@/infrastructure/auth/decorators/require-permission.decorator';
import { Permission } from '@/domain/role/value-objects/permission.vo';
import { CurrentUser } from '@/infrastructure/auth/decorators/current-user.decorator';
import { type JwtPayload } from '@/application/auth/services/jwt.service';
import { CreateReservationDto } from '@/presentation/dtos/reservation/create-reservation.dto';
import { UpdateReservationDto } from '@/presentation/dtos/reservation/update-reservation.dto';
import { CancelReservationDto } from '@/presentation/dtos/reservation/cancel-reservation.dto';
import { CheckInReservationDto } from '@/presentation/dtos/reservation/check-in-reservation.dto';
import { CreateReservationCommand } from '@/application/reservation/commands/create-reservation/create-reservation.command';
import { CreateReservationResult } from '@/application/reservation/commands/create-reservation/create-reservation.result';
import { ConfirmReservationCommand } from '@/application/reservation/commands/confirm-reservation/confirm-reservation.command';
import { CancelReservationCommand } from '@/application/reservation/commands/cancel-reservation/cancel-reservation.command';
import { CheckInCommand } from '@/application/reservation/commands/check-in/check-in.command';
import { CheckOutCommand } from '@/application/reservation/commands/check-out/check-out.command';
import { MarkNoShowCommand } from '@/application/reservation/commands/mark-no-show/mark-no-show.command';
import { UpdateReservationCommand } from '@/application/reservation/commands/update-reservation/update-reservation.command';
import { GetReservationByIdQuery } from '@/application/reservation/queries/get-reservation-by-id/get-reservation-by-id.query';
import { GetReservationsByTenantQuery } from '@/application/reservation/queries/get-reservations-by-tenant/get-reservations-by-tenant.query';
import { GetReservationsByTenantResult } from '@/application/reservation/queries/get-reservations-by-tenant/get-reservations-by-tenant.result';
import { GetReservationsByUnitQuery } from '@/application/reservation/queries/get-reservations-by-unit/get-reservations-by-unit.query';
import { ReservationDto } from '@/application/reservation/queries/shared/reservation.dto';
import { ReservationSourceEnum } from '@/domain/reservation/value-objects/reservation-source.vo';

@ApiTags('reservations')
@ApiBearerAuth('JWT-auth')
@Controller('reservations')
export class ReservationController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.RESERVATION_CREATE)
  @ApiOperation({ summary: 'Create a new reservation' })
  @ApiResponse({ status: 201, description: 'Reservation created successfully' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateReservationDto,
  ) {
    const result = await this.commandBus.execute<
      CreateReservationCommand,
      CreateReservationResult
    >(
      new CreateReservationCommand(
        user.tenantId,
        dto.propertyId,
        dto.unitId,
        dto.guestId,
        new Date(dto.checkIn),
        new Date(dto.checkOut),
        dto.guestsCount,
        dto.notes ?? null,
        dto.source as unknown as ReservationSourceEnum,
        user.userId,
        user.email,
      ),
    );

    return {
      message: 'Reservation created successfully',
      reservationId: result.reservationId,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.RESERVATION_VIEW)
  @ApiOperation({ summary: 'List all reservations for the tenant' })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.queryBus.execute<
      GetReservationsByTenantQuery,
      GetReservationsByTenantResult
    >(
      new GetReservationsByTenantQuery(
        user.tenantId,
        Number.parseInt(page, 10),
        Number.parseInt(limit, 10),
      ),
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.RESERVATION_VIEW)
  @ApiOperation({ summary: 'Get a reservation by ID' })
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<ReservationDto> {
    return this.queryBus.execute<GetReservationByIdQuery, ReservationDto>(
      new GetReservationByIdQuery(id, user.tenantId),
    );
  }

  @Get('unit/:unitId')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.RESERVATION_VIEW)
  @ApiOperation({
    summary: 'Get reservations by unit, optionally filtered by date range',
  })
  async findByUnit(
    @CurrentUser() user: JwtPayload,
    @Param('unitId') unitId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<ReservationDto[]> {
    return this.queryBus.execute<GetReservationsByUnitQuery, ReservationDto[]>(
      new GetReservationsByUnitQuery(
        user.tenantId,
        unitId,
        startDate ? new Date(startDate) : null,
        endDate ? new Date(endDate) : null,
      ),
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.RESERVATION_EDIT)
  @ApiOperation({ summary: 'Update reservation dates or notes' })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateReservationDto,
  ) {
    await this.commandBus.execute(
      new UpdateReservationCommand(
        id,
        user.tenantId,
        dto.checkIn ? new Date(dto.checkIn) : null,
        dto.checkOut ? new Date(dto.checkOut) : null,
        dto.notes ?? null,
        user.userId,
        user.email,
      ),
    );
    return { message: 'Reservation updated successfully' };
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.RESERVATION_EDIT)
  @ApiOperation({ summary: 'Confirm a pending reservation' })
  async confirm(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.commandBus.execute(
      new ConfirmReservationCommand(id, user.tenantId, user.userId, user.email),
    );
    return { message: 'Reservation confirmed successfully' };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.RESERVATION_EDIT)
  @ApiOperation({ summary: 'Cancel a reservation' })
  async cancel(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: CancelReservationDto,
  ) {
    await this.commandBus.execute(
      new CancelReservationCommand(
        id,
        user.tenantId,
        dto.reason ?? null,
        user.userId,
        user.email,
      ),
    );
    return { message: 'Reservation cancelled successfully' };
  }

  @Post(':id/check-in')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.RESERVATION_EDIT)
  @ApiOperation({ summary: 'Mark a reservation as checked in' })
  async checkIn(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto?: CheckInReservationDto,
  ) {
    const travelers = dto?.travelers?.map((t) => ({
      fullName: t.fullName,
      documentType: t.documentType,
      documentNumber: t.documentNumber,
      nationality: t.nationality,
      dateOfBirth: t.dateOfBirth ? new Date(t.dateOfBirth) : null,
      phone: t.phone ?? null,
    }));

    await this.commandBus.execute(
      new CheckInCommand(
        id,
        user.tenantId,
        null,
        user.userId,
        user.email,
        travelers,
      ),
    );
    return { message: 'Checked in successfully' };
  }

  @Post(':id/check-out')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.RESERVATION_EDIT)
  @ApiOperation({ summary: 'Mark a reservation as checked out' })
  async checkOut(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.commandBus.execute(
      new CheckOutCommand(id, user.tenantId, null, user.userId, user.email),
    );
    return { message: 'Checked out successfully' };
  }

  @Post(':id/no-show')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission(Permission.RESERVATION_EDIT)
  @ApiOperation({ summary: 'Mark a reservation as no-show' })
  async markNoShow(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    await this.commandBus.execute(
      new MarkNoShowCommand(id, user.tenantId, user.userId, user.email),
    );
    return { message: 'Reservation marked as no-show' };
  }
}
