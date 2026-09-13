import { Injectable } from '@nestjs/common';
import { UnitRating } from '@/domain/unit-rating/entities/unit-rating.entity';
import { UnitRatingRepository } from '@/domain/unit-rating/repositories/unit-rating.repository';
import { UnitRatingId } from '@/domain/unit-rating/value-objects/unit-rating-id.vo';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import { ReservationId } from '@/domain/reservation/value-objects/reservation-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import {
  Prisma,
  type unit_ratings as UnitRatingRow,
} from '@/infrastructure/persistence/prisma/generated/client';

@Injectable()
export class PrismaUnitRatingRepository implements UnitRatingRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(rating: UnitRating): Promise<string> {
    const id = rating.getId()?.toString();

    const data = {
      rate: rating.getRate(),
      message: rating.getMessage(),
      updated_at: rating.getUpdatedAt(),
    };

    if (id) {
      await this.prisma.unit_ratings.update({ where: { id }, data });
      return id;
    }

    const created = await this.prisma.unit_ratings.create({
      data: {
        ...data,
        tenant_id: rating.getTenantId().toString(),
        unit_id: rating.getUnitId().toString(),
        guest_id: rating.getGuestId().toString(),
        reservation_id: rating.getReservationId().toString(),
        created_at: rating.getCreatedAt(),
      },
    });
    return created.id;
  }

  async findById(id: UnitRatingId): Promise<UnitRating | null> {
    const row = await this.prisma.unit_ratings.findFirst({
      where: { id: id.toString(), deleted_at: null },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByReservationId(
    reservationId: ReservationId,
  ): Promise<UnitRating | null> {
    const row = await this.prisma.unit_ratings.findFirst({
      where: { reservation_id: reservationId.toString(), deleted_at: null },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByUnitIdPaginated(
    unitId: UnitId,
    page: number,
    limit: number,
    sort?: 'best' | 'worst',
    filterRate?: number,
  ): Promise<{ ratings: UnitRating[]; total: number }> {
    const where = {
      unit_id: unitId.toString(),
      deleted_at: null,
      ...(filterRate !== undefined ? { rate: filterRate } : {}),
    };

    const orderBy: Prisma.unit_ratingsOrderByWithRelationInput[] =
      sort === 'best'
        ? [{ rate: 'desc' }, { created_at: 'desc' }]
        : sort === 'worst'
          ? [{ rate: 'asc' }, { created_at: 'desc' }]
          : [{ created_at: 'desc' }];

    return this.paginate(where, page, limit, orderBy);
  }

  async findByGuestIdPaginated(
    guestId: GuestId,
    page: number,
    limit: number,
  ): Promise<{ ratings: UnitRating[]; total: number }> {
    return this.paginate(
      { guest_id: guestId.toString(), deleted_at: null },
      page,
      limit,
      [{ created_at: 'desc' }],
    );
  }

  async calculateAverageForUnit(unitId: UnitId): Promise<number | null> {
    return this.average({ unit_id: unitId.toString(), deleted_at: null });
  }

  async calculateAverageForGuest(guestId: GuestId): Promise<number | null> {
    return this.average({ guest_id: guestId.toString(), deleted_at: null });
  }

  /**
   * Mongo's $group returned no documents when nothing matched; AVG here returns a single
   * row holding NULL, so the emptiness check is on the value, not on a row count.
   */
  private async average(
    where: Prisma.unit_ratingsWhereInput,
  ): Promise<number | null> {
    const { _avg } = await this.prisma.unit_ratings.aggregate({
      where,
      _avg: { rate: true },
    });
    if (_avg.rate === null) return null;
    return Math.round(_avg.rate * 10) / 10;
  }

  private async paginate(
    where: Prisma.unit_ratingsWhereInput,
    page: number,
    limit: number,
    orderBy: Prisma.unit_ratingsOrderByWithRelationInput[],
  ): Promise<{ ratings: UnitRating[]; total: number }> {
    const [total, rows] = await Promise.all([
      this.prisma.unit_ratings.count({ where }),
      this.prisma.unit_ratings.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { ratings: rows.map((row) => this.toDomain(row)), total };
  }

  private toDomain(row: UnitRatingRow): UnitRating {
    return UnitRating.reconstitute({
      id: UnitRatingId.create(row.id),
      tenantId: TenantId.createFromString(row.tenant_id),
      unitId: UnitId.create(row.unit_id),
      guestId: GuestId.createFromString(row.guest_id),
      reservationId: ReservationId.create(row.reservation_id),
      rate: row.rate,
      message: row.message,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    });
  }
}
