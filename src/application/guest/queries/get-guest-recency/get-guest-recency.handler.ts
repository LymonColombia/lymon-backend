import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetGuestRecencyQuery } from './get-guest-recency.query';
import { GetGuestRecencyResult } from './get-guest-recency.result';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepository,
} from '@/domain/reservation/repositories/reservation.repository';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

@QueryHandler(GetGuestRecencyQuery)
export class GetGuestRecencyHandler
  implements IQueryHandler<GetGuestRecencyQuery, GetGuestRecencyResult>
{
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepository,
  ) {}

  async execute(query: GetGuestRecencyQuery): Promise<GetGuestRecencyResult> {
    let guestId: GuestId;
    try {
      guestId = GuestId.createFromString(query.guestId);
    } catch {
      return new GetGuestRecencyResult(null, null);
    }

    const lastStayAt = await this.reservationRepository.getLastStayAt(
      query.tenantId,
      guestId.toString(),
    );

    if (!lastStayAt) {
      return new GetGuestRecencyResult(null, null);
    }

    const daysSinceLastStay = Math.max(
      0,
      Math.floor((Date.now() - lastStayAt.getTime()) / MS_PER_DAY),
    );

    return new GetGuestRecencyResult(lastStayAt.toISOString(), daysSinceLastStay);
  }
}
