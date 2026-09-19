import { UnitRating } from '@/domain/unit-rating/entities/unit-rating.entity';
import { UnitRatingId } from '@/domain/unit-rating/value-objects/unit-rating-id.vo';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import { ReservationId } from '@/domain/reservation/value-objects/reservation-id.vo';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';

export const UNIT_RATING_REPOSITORY = 'UNIT_RATING_REPOSITORY';

export interface UnitRatingRepository {
  save(rating: UnitRating): Promise<string>;
  findById(id: UnitRatingId): Promise<UnitRating | null>;
  findByReservationId(reservationId: ReservationId): Promise<UnitRating | null>;
  findByUnitIdPaginated(
    unitId: UnitId,
    page: number,
    limit: number,
    sort?: 'best' | 'worst',
    filterRate?: number,
  ): Promise<{ ratings: UnitRating[]; total: number }>;
  calculateAverageForUnit(unitId: UnitId): Promise<number | null>;
  findByGuestIdPaginated(
    guestId: GuestId,
    page: number,
    limit: number,
  ): Promise<{ ratings: UnitRating[]; total: number }>;
  calculateAverageForGuest(guestId: GuestId): Promise<number | null>;
}
