import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetReservationByIdQuery } from './get-reservation-by-id.query';
import { ReservationDto } from '../shared/reservation.dto';
import { toReservationDto } from '../shared/reservation.mapper';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepository,
} from '@/domain/reservation/repositories/reservation.repository';
import { ReservationId } from '@/domain/reservation/value-objects/reservation-id.vo';

@QueryHandler(GetReservationByIdQuery)
export class GetReservationByIdHandler implements IQueryHandler<
  GetReservationByIdQuery,
  ReservationDto
> {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepository,
  ) {}

  async execute(query: GetReservationByIdQuery): Promise<ReservationDto> {
    const id = ReservationId.create(query.reservationId);
    const reservation = await this.reservationRepository.findById(id);

    if (
      !reservation ||
      reservation?.getTenantId().toString() !== query.tenantId
    ) {
      throw new NotFoundException('Reservation not found');
    }

    return toReservationDto(reservation);
  }
}
