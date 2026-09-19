import { GuestLifecycleStatus } from '@/domain/guest/value-objects/guest-lifecycle-status.vo';
import { Reservation } from '../entities/reservation.entity';
import { ReservationStatusEnum } from '../value-objects/reservation-status.vo';

export const GUEST_RESERVATIONS_READ_REPOSITORY =
  'GUEST_RESERVATIONS_READ_REPOSITORY';

export interface GuestReservationFilters {
  statuses?: ReservationStatusEnum[];
  fromDate?: Date;
  toDate?: Date;
}

export interface GuestReservationQueryOptions extends GuestReservationFilters {
  page: number;
  limit: number;
  sortBy?: 'date' | 'status' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface GuestReservationsReadRepository {
  findByGuestIds(
    guestIds: string[],
    options: GuestReservationQueryOptions,
  ): Promise<Reservation[]>;
  countByGuestIds(
    guestIds: string[],
    filters?: GuestReservationFilters,
  ): Promise<number>;
  getLifecycleStatusByGuestIds(
    guestIds: string[]
  ): Promise<Map<string, GuestLifecycleStatus>>;
}


