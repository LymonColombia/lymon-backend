import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { ReservationId } from '@/domain/reservation/value-objects/reservation-id.vo';
import { UnitRatingId } from '@/domain/unit-rating/value-objects/unit-rating-id.vo';
import { DomainException } from '@/domain/shared/exceptions/domain.exception';

export interface UnitRatingCreateInput {
  tenantId: TenantId;
  unitId: UnitId;
  guestId: GuestId;
  reservationId: ReservationId;
  rate: number;
  message: string | null;
}

export interface UnitRatingReconstituteInput extends UnitRatingCreateInput {
  id: UnitRatingId;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export class UnitRating {
  private constructor(
    private readonly id: UnitRatingId | null,
    private readonly tenantId: TenantId,
    private readonly unitId: UnitId,
    private readonly guestId: GuestId,
    private readonly reservationId: ReservationId,
    private readonly rate: number,
    private readonly message: string | null,
    private readonly createdAt: Date,
    private readonly updatedAt: Date,
    private readonly deletedAt: Date | null,
  ) {}

  static create(input: UnitRatingCreateInput): UnitRating {
    if (input.rate < 1 || input.rate > 5 || !Number.isInteger(input.rate)) {
      throw new DomainException('Rate must be an integer between 1 and 5');
    }

    return new UnitRating(
      null,
      input.tenantId,
      input.unitId,
      input.guestId,
      input.reservationId,
      input.rate,
      input.message ?? null,
      new Date(),
      new Date(),
      null,
    );
  }

  static reconstitute(input: UnitRatingReconstituteInput): UnitRating {
    return new UnitRating(
      input.id,
      input.tenantId,
      input.unitId,
      input.guestId,
      input.reservationId,
      input.rate,
      input.message,
      input.createdAt,
      input.updatedAt,
      input.deletedAt,
    );
  }

  getId(): UnitRatingId | null {
    return this.id;
  }

  getTenantId(): TenantId {
    return this.tenantId;
  }

  getUnitId(): UnitId {
    return this.unitId;
  }

  getGuestId(): GuestId {
    return this.guestId;
  }

  getReservationId(): ReservationId {
    return this.reservationId;
  }

  getRate(): number {
    return this.rate;
  }

  getMessage(): string | null {
    return this.message;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  getDeletedAt(): Date | null {
    return this.deletedAt;
  }
}
