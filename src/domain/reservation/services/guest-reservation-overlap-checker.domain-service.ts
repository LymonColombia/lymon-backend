import { DomainException } from '@/domain/shared/exceptions/domain.exception';
import { Reservation } from '@/domain/reservation/entities/reservation.entity';
import { ReservationStatusEnum } from '@/domain/reservation/value-objects/reservation-status.vo';
import { DateRange } from '@/domain/reservation/value-objects/date-range.vo';

const INACTIVE_STATUSES = new Set<ReservationStatusEnum>([
  ReservationStatusEnum.CANCELLED,
  ReservationStatusEnum.NO_SHOW,
]);

export class GuestReservationOverlapChecker {
  static check(
    guestReservations: Reservation[],
    propertyId: string,
    dateRange: DateRange,
    excludeReservationId?: string,
  ): void {
    const conflicting = guestReservations.find((r) => {
      if (
        excludeReservationId &&
        r.getId()?.toString() === excludeReservationId
      ) {
        return false;
      }
      if (INACTIVE_STATUSES.has(r.getStatus().getValue())) return false;
      if (r.getPropertyId().toString() !== propertyId) return false;
      return r.getDateRange().overlaps(dateRange);
    });

    if (conflicting) {
      throw new DomainException(
        'Guest already has an overlapping reservation at this property for the requested dates',
      );
    }
  }
}
