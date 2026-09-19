import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUnitOccupancyQuery } from './get-unit-occupancy.query';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepository,
} from '@/domain/reservation/repositories/reservation.repository';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import { DateRange } from '@/domain/reservation/value-objects/date-range.vo';
import { ReservationStatusEnum } from '@/domain/reservation/value-objects/reservation-status.vo';

@QueryHandler(GetUnitOccupancyQuery)
export class GetUnitOccupancyHandler implements IQueryHandler<
  GetUnitOccupancyQuery,
  { checkIn: Date; checkOut: Date }[]
> {
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepository,
  ) {}

  async execute(query: GetUnitOccupancyQuery) {
    const unitId = UnitId.create(query.unitId);

    // Reconstitute date range to avoid "past date" validation during querying
    const searchRange = DateRange.reconstitute(query.startDate, query.endDate);

    const reservations =
      await this.reservationRepository.findByUnitAndDateRange(
        unitId,
        searchRange,
      );

    const INACTIVE_STATUSES = new Set<ReservationStatusEnum>([
      ReservationStatusEnum.CANCELLED,
      ReservationStatusEnum.NO_SHOW,
    ]);

    // Return only active reservations that occupy space
    return reservations
      .filter((r) => !INACTIVE_STATUSES.has(r.getStatus().getValue()))
      .map((r) => ({
        checkIn: r.getDateRange().getCheckIn(),
        checkOut: r.getDateRange().getCheckOut(),
      }));
  }
}
