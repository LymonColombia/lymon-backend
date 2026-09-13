import { ReservationStatus } from '@/domain/reservation/value-objects/reservation-status.vo';
import { ReservationSource } from '@/domain/reservation/value-objects/reservation-source.vo';
import { DateRange } from '@/domain/reservation/value-objects/date-range.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { TravelerInfo } from '@/domain/reservation/entities/reservation.entity';

export interface IReservationData {
  id: string;
  tenantId: TenantId;
  propertyId: PropertyId;
  unitId: UnitId;
  guestId: GuestId;
  dateRange: DateRange;
  source: ReservationSource;
  status: ReservationStatus;
  guestsCount: number;
  pricePerNight: number;
  totalPrice: number;
  notes: string | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  checkInActualAt: Date | null;
  checkOutActualAt: Date | null;
  reservationNumber: number;
  checkInInfo: TravelerInfo[];
  createdAt: Date;
  updatedAt: Date;
}
