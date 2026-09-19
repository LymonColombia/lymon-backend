import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '@/infrastructure/auth/decorators/public.decorator';
import { GuestPublic } from '@/infrastructure/guest-auth/decorators/guest-public.decorator';
import { GuestJwtAuthGuard } from '@/infrastructure/guest-auth/guards/guest-jwt-auth.guard';
import { CurrentGuest } from '@/infrastructure/guest-auth/decorators/current-guest.decorator';
import { type GuestJwtPayload } from '@/application/guest-auth/services/guest-jwt.service';
import { GetGuestReservationQuery } from '@/application/reservation/queries/get-guest-reservation/get-guest-reservation.query';
import { GuestReservationDetailResult } from '@/application/reservation/queries/get-guest-reservation/get-guest-reservation.result';
import { GetGuestReservationsQuery } from '@/application/reservation/queries/get-guest-reservations/get-guest-reservations.query';
import { GetGuestReservationsResult } from '@/application/reservation/queries/get-guest-reservations/get-guest-reservations.result';
import { GetUnitOccupancyQuery } from '@/application/reservation/queries/get-unit-occupancy/get-unit-occupancy.query';
import { CancelGuestReservationCommand } from '@/application/reservation/commands/cancel-guest-reservation/cancel-guest-reservation.command';
import type { CancelGuestReservationResult } from '@/application/reservation/commands/cancel-guest-reservation/cancel-guest-reservation.handler';
import { SubmitCheckInInfoCommand } from '@/application/reservation/commands/submit-check-in-info/submit-check-in-info.command';
import { SubmitCheckInInfoDto } from '@/presentation/dtos/reservation/submit-check-in-info.dto';
import { ReservationStatusEnum } from '@/domain/reservation/value-objects/reservation-status.vo';

@ApiTags('guest-reservations')
@ApiBearerAuth('GuestJWT-auth')
@Public()
@UseGuards(GuestJwtAuthGuard)
@Controller('guest/reservations')
export class GuestReservationController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List authenticated guest bookings' })
  @ApiResponse({ status: 200, description: 'Paginated guest bookings list' })
  @ApiQuery({
    name: 'status',
    required: false,
    description:
      'Filter by status: active, pending, confirmed, checked_in, finished, cancelled',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (default: 1)',
    example: '1',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 20)',
    example: '20',
  })
  @ApiQuery({
    name: 'fromDate',
    required: false,
    description: 'Filter reservations from this date (ISO format)',
    example: '2024-01-01',
  })
  @ApiQuery({
    name: 'toDate',
    required: false,
    description: 'Filter reservations until this date (ISO format)',
    example: '2024-12-31',
  })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    description: 'Sort field: date, status, createdAt',
    example: 'date',
    enum: ['date', 'status', 'createdAt'],
  })
  @ApiQuery({
    name: 'sortOrder',
    required: false,
    description: 'Sort direction: asc or desc',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  async findAll(
    @CurrentGuest() guest: GuestJwtPayload,
    @Query()
    query: {
      page?: string;
      limit?: string;
      status?: string;
      fromDate?: string;
      toDate?: string;
      sortBy?: 'date' | 'status' | 'createdAt';
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<GetGuestReservationsResult> {
    const parsedStatuses = this.parseStatuses(query.status);
    const sortBy = query.sortBy ?? 'date';
    const sortOrder = query.sortOrder ?? 'desc';

    return this.queryBus.execute<
      GetGuestReservationsQuery,
      GetGuestReservationsResult
    >(
      new GetGuestReservationsQuery(
        guest.guestAccountId,
        Math.max(1, Number.parseInt(query.page ?? '1', 10) || 1),
        Math.max(1, Number.parseInt(query.limit ?? '20', 10) || 20),
        parsedStatuses,
        query.fromDate ? new Date(query.fromDate) : undefined,
        query.toDate ? new Date(query.toDate) : undefined,
        sortBy,
        sortOrder,
      ),
    );
  }

  @Get('unit/:unitId/calendar')
  @GuestPublic()
  @Public()
  @ApiOperation({ summary: 'Get occupied dates for a specific unit calendar' })
  @ApiResponse({ status: 200, description: 'List of occupied date ranges' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    description: 'Start date of the range (defaults to today)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    description: 'End date of the range (defaults to 1 year from now)',
  })
  async getUnitCalendar(
    @Param('unitId') unitId: string,
    @Query('startDate') startDateStr?: string,
    @Query('endDate') endDateStr?: string,
  ): Promise<{ message: string; data: { checkIn: Date; checkOut: Date }[] }> {
    const startDate = startDateStr ? new Date(startDateStr) : new Date();
    const endDate = endDateStr
      ? new Date(endDateStr)
      : new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);

    const occupancy = await this.queryBus.execute<
      GetUnitOccupancyQuery,
      { checkIn: Date; checkOut: Date }[]
    >(new GetUnitOccupancyQuery(unitId, startDate, endDate));

    return {
      message: 'Occupancy calendar retrieved successfully',
      data: occupancy,
    };
  }

  @Post(':id/check-in-info')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit traveler information for virtual check-in' })
  @ApiResponse({
    status: 200,
    description: 'Check-in info submitted successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid status or traveler count exceeds guests count',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  async submitCheckInInfo(
    @CurrentGuest() guest: GuestJwtPayload,
    @Param('id') id: string,
    @Body() dto: SubmitCheckInInfoDto,
  ): Promise<{ message: string }> {
    await this.commandBus.execute(
      new SubmitCheckInInfoCommand(
        id,
        guest.guestAccountId,
        dto.travelers.map((t) => ({
          fullName: t.fullName,
          documentType: t.documentType,
          documentNumber: t.documentNumber,
          nationality: t.nationality,
          dateOfBirth: t.dateOfBirth ? new Date(t.dateOfBirth) : null,
          phone: t.phone ?? null,
        })),
      ),
    );

    return { message: 'Check-in info submitted successfully' };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a guest reservation by ID' })
  @ApiResponse({ status: 200, description: 'Reservation detail for guest' })
  async findOne(
    @CurrentGuest() guest: GuestJwtPayload,
    @Param('id') id: string,
  ): Promise<GuestReservationDetailResult> {
    return this.queryBus.execute<
      GetGuestReservationQuery,
      GuestReservationDetailResult
    >(new GetGuestReservationQuery(id, guest.guestAccountId));
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a guest reservation' })
  @ApiResponse({ status: 200, description: 'Reservation cancelled' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Reservation not found' })
  async cancel(
    @CurrentGuest() guest: GuestJwtPayload,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ): Promise<{ message: string; data: CancelGuestReservationResult }> {
    const result = await this.commandBus.execute<
      CancelGuestReservationCommand,
      CancelGuestReservationResult
    >(
      new CancelGuestReservationCommand(
        id,
        guest.guestAccountId,
        reason ?? null,
      ),
    );

    return {
      message: 'Reservation cancelled successfully',
      data: result,
    };
  }

  private parseStatuses(status?: string): ReservationStatusEnum[] | undefined {
    if (!status) {
      return undefined;
    }

    const normalized = status.toLowerCase();

    if (normalized === 'active') {
      return [
        ReservationStatusEnum.PENDING,
        ReservationStatusEnum.CONFIRMED,
        ReservationStatusEnum.CHECKED_IN,
      ];
    }

    if (normalized === 'finished') {
      return [ReservationStatusEnum.CHECKED_OUT];
    }

    const statusMap: Record<string, ReservationStatusEnum> = {
      pending: ReservationStatusEnum.PENDING,
      confirmed: ReservationStatusEnum.CONFIRMED,
      checked_in: ReservationStatusEnum.CHECKED_IN,
      cancelled: ReservationStatusEnum.CANCELLED,
      finished: ReservationStatusEnum.CHECKED_OUT,
    };

    const mapped = statusMap[normalized];
    return mapped ? [mapped] : undefined;
  }
}
