import { Reservation } from '@/domain/reservation/entities/reservation.entity';
import { ReservationStatusEnum } from '@/domain/reservation/value-objects/reservation-status.vo';

const INACTIVE_STATUSES = new Set<ReservationStatusEnum>([
  ReservationStatusEnum.CANCELLED,
  ReservationStatusEnum.NO_SHOW,
]);

export class InventoryCountValidator {
  static getMinimumRequiredInventory(reservations: Reservation[]): number {
    const activeReservations = reservations.filter(
      (reservation) =>
        !INACTIVE_STATUSES.has(reservation.getStatus().getValue()),
    );

    if (activeReservations.length === 0) {
      return 0;
    }

    const events: Array<{ at: Date; delta: number }> = [];

    for (const reservation of activeReservations) {
      const range = reservation.getDateRange();
      events.push(
        { at: range.getCheckIn(), delta: 1 },
        { at: range.getCheckOut(), delta: -1 },
      );
    }

    events.sort((a, b) => {
      if (a.at.getTime() !== b.at.getTime()) {
        return a.at.getTime() - b.at.getTime();
      }

      return a.delta - b.delta;
    });

    let current = 0;
    let peak = 0;

    for (const event of events) {
      current += event.delta;
      if (current > peak) {
        peak = current;
      }
    }

    return peak;
  }
}
