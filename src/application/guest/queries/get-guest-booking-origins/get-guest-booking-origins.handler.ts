import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetGuestBookingOriginsQuery } from './get-guest-booking-origins.query';
import { GetGuestBookingOriginsResult } from './get-guest-booking-origins.result';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepository,
} from '@/domain/reservation/repositories/reservation.repository';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';

@QueryHandler(GetGuestBookingOriginsQuery)
export class GetGuestBookingOriginsHandler
  implements IQueryHandler<GetGuestBookingOriginsQuery, GetGuestBookingOriginsResult>
{
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepository,
  ) {}

  async execute(query: GetGuestBookingOriginsQuery): Promise<GetGuestBookingOriginsResult> {
    try {
      GuestId.createFromString(query.guestId);
    } catch {
      return new GetGuestBookingOriginsResult(0, []);
    }

    const grouped = await this.reservationRepository.countByGuestIdGroupedBySource(
      query.tenantId,
      query.guestId,
    );

    const total = grouped.reduce((sum, item) => sum + item.count, 0);

    if (total === 0) {
      return new GetGuestBookingOriginsResult(0, []);
    }

    const sources = grouped.map((item) => ({
      source: item.source,
      count: item.count,
      percentage: Math.round((item.count / total) * 100),
    }));

    return new GetGuestBookingOriginsResult(total, sources);
  }
}
