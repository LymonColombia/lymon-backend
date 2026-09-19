import { ReservationStatusEnum } from '@/domain/reservation/value-objects/reservation-status.vo';

export type GuestReservationStatus = ReservationStatusEnum;

export interface GuestReservationListItemDto {
  id: string;
  bookingReference: string;
  propertyId: string;
  propertyName: string | null;
  unitId: string;
  unitName: string | null;
  serviceName: string;
  checkIn: Date;
  checkOut: Date;
  status: GuestReservationStatus;
}

export class GetGuestReservationsResult {
  constructor(
    public readonly items: GuestReservationListItemDto[],
    public readonly total: number,
    public readonly page: number,
    public readonly limit: number,
  ) {}
}
