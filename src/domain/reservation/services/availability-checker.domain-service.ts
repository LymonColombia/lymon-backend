import { DateRange } from '../value-objects/date-range.vo';
import { ReservationStatusEnum } from '../value-objects/reservation-status.vo';
import { Reservation } from '../entities/reservation.entity';

const INACTIVE_STATUSES = new Set<ReservationStatusEnum>([
  ReservationStatusEnum.CANCELLED,
  ReservationStatusEnum.NO_SHOW,
  ReservationStatusEnum.CHECKED_OUT,
]);

export class AvailabilityChecker {
  static isAvailable(
    requestedRange: DateRange,
    existingReservations: Reservation[],
    inventoryCount: number,
  ): boolean {
    const overlapping = existingReservations.filter((reservation) => {
      if (INACTIVE_STATUSES.has(reservation.getStatus().getValue()))
        return false;
      return reservation.getDateRange().overlaps(requestedRange);
    });

    return overlapping.length < inventoryCount;
  }
}
