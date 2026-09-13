import { Injectable } from '@nestjs/common';
import type {
  GuestReservationFilters,
  GuestReservationQueryOptions,
  GuestReservationsReadRepository,
} from '@/domain/reservation/repositories/guest-reservations-read.repository';
import type { ReservationRepository } from '@/domain/reservation/repositories/reservation.repository';
import {
  Reservation,
  TravelerInfo,
} from '@/domain/reservation/entities/reservation.entity';
import { ReservationId } from '@/domain/reservation/value-objects/reservation-id.vo';
import { DateRange } from '@/domain/reservation/value-objects/date-range.vo';
import {
  ReservationSource,
  ReservationSourceEnum,
} from '@/domain/reservation/value-objects/reservation-source.vo';
import {
  ReservationStatus,
  ReservationStatusEnum,
} from '@/domain/reservation/value-objects/reservation-status.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { TransactionContextData } from '@/domain/shared/transaction-manager.interface';
import { GuestLifecycleStatus } from '@/domain/guest/value-objects/guest-lifecycle-status.vo';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import {
  Prisma,
  type reservations as ReservationRow,
} from '@/infrastructure/persistence/prisma/generated/client';

const ACTIVE_RESERVATION_STATUSES = [
  ReservationStatusEnum.PENDING,
  ReservationStatusEnum.CONFIRMED,
  ReservationStatusEnum.CHECKED_IN,
];

const SPENDING_STATUSES = [
  ReservationStatusEnum.CONFIRMED,
  ReservationStatusEnum.CHECKED_IN,
  ReservationStatusEnum.CHECKED_OUT,
];

/** Highest wins when a guest has several reservations. */
const LIFECYCLE_PRIORITY: Array<[ReservationStatusEnum, GuestLifecycleStatus]> = [
  [ReservationStatusEnum.CHECKED_IN, GuestLifecycleStatus.CHECKED_IN],
  [ReservationStatusEnum.CONFIRMED, GuestLifecycleStatus.UPCOMING_STAY],
  [ReservationStatusEnum.CHECKED_OUT, GuestLifecycleStatus.PAST_GUEST],
];

@Injectable()
export class PrismaReservationRepository
  implements ReservationRepository, GuestReservationsReadRepository
{
  constructor(private readonly prisma: PrismaService) {}

  private client(context?: TransactionContextData) {
    return (context as Prisma.TransactionClient | undefined) ?? this.prisma;
  }

  async save(
    reservation: Reservation,
    ctx?: TransactionContextData,
  ): Promise<string> {
    const db = this.client(ctx);
    const id = reservation.getId()?.toString();
    const tenantId = reservation.getTenantId().toString();

    const data = {
      check_in: reservation.getDateRange().getCheckIn(),
      check_out: reservation.getDateRange().getCheckOut(),
      source: reservation.getSource().toString(),
      status: reservation.getStatus().toString(),
      guests_count: reservation.getGuestsCount(),
      price_per_night: reservation.getPricePerNight(),
      total_price: reservation.getTotalPrice(),
      notes: reservation.getNotes(),
      cancelled_at: reservation.getCancelledAt(),
      cancellation_reason: reservation.getCancellationReason(),
      check_in_actual_at: reservation.getCheckInActualAt(),
      check_out_actual_at: reservation.getCheckOutActualAt(),
      check_in_info:
        reservation.getCheckInInfo() as unknown as Prisma.InputJsonValue,
      updated_at: reservation.getUpdatedAt(),
    };

    if (id) {
      await db.reservations.update({ where: { id }, data });
      return id;
    }

    const created = await this.insertWithReservationNumber(db, tenantId, {
      ...data,
      tenant_id: tenantId,
      property_id: reservation.getPropertyId().toString(),
      unit_id: reservation.getUnitId().toString(),
      guest_id: reservation.getGuestId().toString(),
      created_at: reservation.getCreatedAt(),
    });

    reservation.setReservationNumber(Number(created.reservation_number));
    return created.id;
  }

  /**
   * Replaces the mongo `counters` collection. UNIQUE (tenant_id, reservation_number)
   * is the real guard: two concurrent inserts can read the same max, and the loser
   * comes back as P2002 and retries with the next number.
   *
   * ponytail: bounded retry, not a lock or a sequence per tenant. Contention is one
   * insert per booking; revisit if reservations ever get created in bulk.
   */
  private async insertWithReservationNumber(
    db: Prisma.TransactionClient | PrismaService,
    tenantId: string,
    data: Omit<Prisma.reservationsUncheckedCreateInput, 'reservation_number'>,
  ): Promise<ReservationRow> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const highest = await db.reservations.aggregate({
        where: { tenant_id: tenantId },
        _max: { reservation_number: true },
      });
      const next = (highest._max.reservation_number ?? 0n) + 1n;

      try {
        return await db.reservations.create({
          data: { ...data, reservation_number: next },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002' &&
          attempt < 4
        ) {
          continue;
        }
        throw error;
      }
    }

    throw new Error(
      `Could not allocate a reservation number for tenant ${tenantId}`,
    );
  }

  async findById(id: ReservationId): Promise<Reservation | null> {
    const row = await this.prisma.reservations.findUnique({
      where: { id: id.toString() },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByTenantId(
    tenantId: string,
    page: number,
    limit: number,
  ): Promise<Reservation[]> {
    return this.findPage({ tenant_id: tenantId }, page, limit, {
      created_at: 'desc',
    });
  }

  async findByPropertyId(
    tenantId: string,
    propertyId: string,
    page: number,
    limit: number,
  ): Promise<Reservation[]> {
    return this.findPage(
      { tenant_id: tenantId, property_id: propertyId },
      page,
      limit,
      { created_at: 'desc' },
    );
  }

  async findByUnitId(
    tenantId: string,
    unitId: string,
    page: number,
    limit: number,
  ): Promise<Reservation[]> {
    return this.findPage({ tenant_id: tenantId, unit_id: unitId }, page, limit, {
      created_at: 'desc',
    });
  }

  async findByGuestId(
    tenantId: string,
    guestId: string,
    page: number,
    limit: number,
    sortBy: 'checkIn' | 'createdAt' = 'createdAt',
    sortDirection: 'asc' | 'desc' = 'desc',
  ): Promise<Reservation[]> {
    return this.findPage(
      { tenant_id: tenantId, guest_id: guestId },
      page,
      limit,
      { [sortBy === 'checkIn' ? 'check_in' : 'created_at']: sortDirection },
    );
  }

  async countByGuestId(tenantId: string, guestId: string): Promise<number> {
    return this.prisma.reservations.count({
      where: { tenant_id: tenantId, guest_id: guestId },
    });
  }

  async countByGuestIdGroupedBySource(
    tenantId: string,
    guestId: string,
  ): Promise<Array<{ source: string; count: number }>> {
    const grouped = await this.prisma.reservations.groupBy({
      by: ['source'],
      where: { tenant_id: tenantId, guest_id: guestId },
      _count: { _all: true },
      orderBy: { _count: { source: 'desc' } },
    });

    return grouped.map((group) => ({
      source: group.source,
      count: group._count._all,
    }));
  }

  async findByGuestIds(
    guestIds: string[],
    options: GuestReservationQueryOptions,
  ): Promise<Reservation[]> {
    if (guestIds.length === 0) return [];

    const column =
      options.sortBy === 'status'
        ? 'status'
        : options.sortBy === 'createdAt'
          ? 'created_at'
          : 'check_in';
    const direction = options.sortOrder === 'asc' ? 'asc' : 'desc';

    const rows = await this.prisma.reservations.findMany({
      where: this.buildGuestFilters(guestIds, options),
      orderBy: [{ [column]: direction }, { created_at: 'desc' }],
      skip: (options.page - 1) * options.limit,
      take: options.limit,
    });
    return rows.map((row) => this.toDomain(row));
  }

  async countByGuestIds(
    guestIds: string[],
    filters?: GuestReservationFilters,
  ): Promise<number> {
    if (guestIds.length === 0) return 0;

    return this.prisma.reservations.count({
      where: this.buildGuestFilters(guestIds, filters),
    });
  }

  async findByUnitAndDateRange(
    unitId: UnitId,
    dateRange: DateRange,
  ): Promise<Reservation[]> {
    const rows = await this.prisma.reservations.findMany({
      where: {
        unit_id: unitId.toString(),
        check_in: { lt: dateRange.getCheckOut() },
        check_out: { gt: dateRange.getCheckIn() },
      },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findActiveByUnitFromDate(
    unitId: UnitId,
    fromDate: Date,
  ): Promise<Reservation[]> {
    const rows = await this.prisma.reservations.findMany({
      where: {
        unit_id: unitId.toString(),
        status: {
          notIn: [
            ReservationStatusEnum.CANCELLED,
            ReservationStatusEnum.NO_SHOW,
            ReservationStatusEnum.CHECKED_OUT,
          ],
        },
        check_out: { gt: fromDate },
      },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async existsActiveByPropertyId(
    tenantId: string,
    propertyId: string,
  ): Promise<boolean> {
    return this.exists({
      tenant_id: tenantId,
      property_id: propertyId,
      status: { in: ACTIVE_RESERVATION_STATUSES },
    });
  }

  async existsActiveByUnitId(
    tenantId: string,
    unitId: string,
  ): Promise<boolean> {
    return this.exists({
      tenant_id: tenantId,
      unit_id: unitId,
      status: { in: ACTIVE_RESERVATION_STATUSES },
    });
  }

  async countByTenantId(tenantId: string): Promise<number> {
    return this.prisma.reservations.count({ where: { tenant_id: tenantId } });
  }

  async findConfirmedDueForCheckIn(date: Date): Promise<Reservation[]> {
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const rows = await this.prisma.reservations.findMany({
      where: {
        status: ReservationStatusEnum.CONFIRMED,
        check_in: { lte: endOfDay },
      },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async getMonthlySpendingByGuestId(
    tenantId: string,
    guestId: string,
    fromDate: Date,
    toDate: Date,
  ): Promise<{ year: number; month: number; totalSpend: number }[]> {
    // groupBy cannot key on an expression, so this one stays raw SQL
    const rows = await this.prisma.$queryRaw<
      { year: number; month: number; total_spend: Prisma.Decimal }[]
    >`
      SELECT date_part('year', check_in)::int  AS year,
             date_part('month', check_in)::int AS month,
             SUM(total_price)                  AS total_spend
      FROM reservations
      WHERE tenant_id = ${tenantId}::uuid
        AND guest_id = ${guestId}::uuid
        AND check_in BETWEEN ${fromDate}::date AND ${toDate}::date
        AND status = ANY (${SPENDING_STATUSES})
      GROUP BY 1, 2
      ORDER BY 1, 2
    `;

    return rows.map((row) => ({
      year: row.year,
      month: row.month,
      totalSpend: Number(row.total_spend),
    }));
  }

  async getLifecycleStatusByGuestIds(
    guestIds: string[],
  ): Promise<Map<string, GuestLifecycleStatus>> {
    if (guestIds.length === 0) return new Map();

    const grouped = await this.prisma.reservations.groupBy({
      by: ['guest_id', 'status'],
      where: { guest_id: { in: guestIds } },
    });

    const statusesByGuest = new Map<string, Set<string>>();
    for (const { guest_id, status } of grouped) {
      const statuses = statusesByGuest.get(guest_id) ?? new Set<string>();
      statuses.add(status);
      statusesByGuest.set(guest_id, statuses);
    }

    const lifecycleByGuest = new Map<string, GuestLifecycleStatus>();
    for (const [guestId, statuses] of statusesByGuest) {
      const match = LIFECYCLE_PRIORITY.find(([status]) => statuses.has(status));
      lifecycleByGuest.set(
        guestId,
        match ? match[1] : GuestLifecycleStatus.NO_RESERVATION,
      );
    }

    return lifecycleByGuest;
  }

  private buildGuestFilters(
    guestIds: string[],
    filters?: GuestReservationFilters,
  ): Prisma.reservationsWhereInput {
    return {
      guest_id: { in: guestIds },
      ...(filters?.statuses?.length ? { status: { in: filters.statuses } } : {}),
      ...(filters?.fromDate || filters?.toDate
        ? {
            check_in: {
              ...(filters.fromDate ? { gte: filters.fromDate } : {}),
              ...(filters.toDate ? { lte: filters.toDate } : {}),
            },
          }
        : {}),
    };
  }

  private async exists(
    where: Prisma.reservationsWhereInput,
  ): Promise<boolean> {
    const row = await this.prisma.reservations.findFirst({
      where,
      select: { id: true },
    });
    return row !== null;
  }

  private async findPage(
    where: Prisma.reservationsWhereInput,
    page: number,
    limit: number,
    orderBy: Prisma.reservationsOrderByWithRelationInput,
  ): Promise<Reservation[]> {
    const rows = await this.prisma.reservations.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });
    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: ReservationRow): Reservation {
    return Reservation.reconstitute({
      id: row.id,
      tenantId: TenantId.createFromString(row.tenant_id),
      propertyId: PropertyId.create(row.property_id),
      unitId: UnitId.create(row.unit_id),
      guestId: GuestId.createFromString(row.guest_id),
      dateRange: DateRange.reconstitute(row.check_in, row.check_out),
      source: ReservationSource.create(row.source as ReservationSourceEnum),
      status: ReservationStatus.create(row.status as ReservationStatusEnum),
      guestsCount: row.guests_count,
      pricePerNight: row.price_per_night.toNumber(),
      totalPrice: row.total_price.toNumber(),
      notes: row.notes,
      cancelledAt: row.cancelled_at,
      cancellationReason: row.cancellation_reason,
      checkInActualAt: row.check_in_actual_at,
      checkOutActualAt: row.check_out_actual_at,
      reservationNumber: Number(row.reservation_number ?? 0),
      checkInInfo: row.check_in_info as unknown as TravelerInfo[],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
