import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetReservationsByGuestIdQuery } from './get-reservations-by-guest-id.query';
import { GetReservationsByGuestIdResult } from './get-reservations-by-guest-id.result';
import { toReservationDto } from '../shared/reservation.mapper';
import {
  GUEST_RESERVATIONS_READ_REPOSITORY,
  type GuestReservationsReadRepository,
} from '@/domain/reservation/repositories/guest-reservations-read.repository';
import {
  GUEST_REPOSITORY,
  type GuestRepository,
} from '@/domain/guest/repositories/guest.repository';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';

@QueryHandler(GetReservationsByGuestIdQuery)
export class GetReservationsByGuestIdHandler implements IQueryHandler<
  GetReservationsByGuestIdQuery,
  GetReservationsByGuestIdResult
> {
  constructor(
    @Inject(GUEST_RESERVATIONS_READ_REPOSITORY)
    private readonly guestReservationsReadRepository: GuestReservationsReadRepository,
    @Inject(GUEST_REPOSITORY)
    private readonly guestRepository: GuestRepository,
  ) {}

  async execute(
    query: GetReservationsByGuestIdQuery,
  ): Promise<GetReservationsByGuestIdResult> {
    const guestAccountId = GuestAccountId.createFromString(
      query.guestAccountId,
    );

    const guestProfiles =
      await this.guestRepository.findAllByGuestAccountId(guestAccountId);

    const guestIds = guestProfiles
      .map((g) => g.getId()?.toString())
      .filter((id): id is string => !!id);

    if (guestIds.length === 0) {
      return new GetReservationsByGuestIdResult([], 0, query.page, query.limit);
    }

    const [reservations, total] = await Promise.all([
      this.guestReservationsReadRepository.findByGuestIds(guestIds, {
        page: query.page,
        limit: query.limit,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      }),
      this.guestReservationsReadRepository.countByGuestIds(guestIds),
    ]);

    return new GetReservationsByGuestIdResult(
      reservations.map(toReservationDto),
      total,
      query.page,
      query.limit,
    );
  }
}
