import { Reservation } from '@/domain/reservation/entities/reservation.entity';
import {
  ReservationStatus,
  ReservationStatusEnum,
} from '@/domain/reservation/value-objects/reservation-status.vo';
import {
  ReservationSource,
  ReservationSourceEnum,
} from '@/domain/reservation/value-objects/reservation-source.vo';
import { DateRange } from '@/domain/reservation/value-objects/date-range.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';

export const RESERVATION_FIXTURE_DEFAULTS = {
  id: '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
  tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000',
  propertyId: '65f1a1a2-b3c4-d5e6-f7a8-b9c300000000',
  unitId: '65f1a1a2-b3c4-d5e6-f7a8-b9c400000000',
  guestId: '65f1a1a2-b3c4-d5e6-f7a8-b9c500000000',
  checkIn: new Date('2030-01-01T14:00:00Z'),
  checkOut: new Date('2030-01-05T10:00:00Z'),
  source: ReservationSourceEnum.DIRECT,
  status: ReservationStatusEnum.CONFIRMED,
  guestsCount: 2,
  pricePerNight: 100,
  totalPrice: 400,
  createdAt: new Date('2030-01-01T10:00:00Z'),
  updatedAt: new Date('2030-01-01T10:00:00Z'),
};

export function makeReservation(
  overrides?: Partial<{
    id: string;
    tenantId: string;
    propertyId: string;
    unitId: string;
    guestId: string;
    checkIn: Date;
    checkOut: Date;
    source: ReservationSourceEnum;
    status: ReservationStatusEnum;
    guestsCount: number;
    pricePerNight: number;
    totalPrice: number;
    createdAt: Date;
    updatedAt: Date;
  }>,
): Reservation {
  const merged = { ...RESERVATION_FIXTURE_DEFAULTS, ...overrides };

  return Reservation.reconstitute({
    id: merged.id,
    tenantId: TenantId.createFromString(merged.tenantId),
    propertyId: PropertyId.create(merged.propertyId),
    unitId: UnitId.create(merged.unitId),
    guestId: GuestId.createFromString(merged.guestId),
    dateRange: DateRange.create(merged.checkIn, merged.checkOut),
    source: ReservationSource.create(merged.source),
    status: ReservationStatus.create(merged.status),
    guestsCount: merged.guestsCount,
    pricePerNight: merged.pricePerNight,
    totalPrice: merged.totalPrice,
    notes: null,
    externalReservationId: null,
    cancelledAt: null,
    cancellationReason: null,
    checkInActualAt: null,
    checkOutActualAt: null,
    reservationNumber: 1,
    checkInInfo: [],
    createdAt: merged.createdAt,
    updatedAt: merged.updatedAt,
  });
}
