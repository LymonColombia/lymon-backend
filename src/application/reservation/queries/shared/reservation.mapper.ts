import { Reservation } from '@/domain/reservation/entities/reservation.entity';
import { ReservationDto } from './reservation.dto';

export function toReservationDto(r: Reservation): ReservationDto {
  const dto = new ReservationDto();
  dto.id = r.getId()!.toString();
  dto.tenantId = r.getTenantId().toString();
  dto.propertyId = r.getPropertyId().toString();
  dto.unitId = r.getUnitId().toString();
  dto.guestId = r.getGuestId().toString();
  dto.checkIn = r.getDateRange().getCheckIn();
  dto.checkOut = r.getDateRange().getCheckOut();
  dto.nights = r.getDateRange().nights();
  dto.source = r.getSource().toString();
  dto.status = r.getStatus().toString();
  dto.guestsCount = r.getGuestsCount();
  dto.pricePerNight = r.getPricePerNight();
  dto.totalPrice = r.getTotalPrice();
  dto.notes = r.getNotes();
  dto.cancelledAt = r.getCancelledAt();
  dto.cancellationReason = r.getCancellationReason();
  dto.checkInActualAt = r.getCheckInActualAt();
  dto.checkOutActualAt = r.getCheckOutActualAt();
  dto.reservationNumber = r.getReservationNumber() ?? 0;
  dto.createdAt = r.getCreatedAt();
  dto.updatedAt = r.getUpdatedAt();
  return dto;
}
