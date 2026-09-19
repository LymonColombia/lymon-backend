import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetGuestLifecycleStatusQuery } from './get-guest-lifecycle-status.query'; 
import { GUEST_RESERVATIONS_READ_REPOSITORY, type GuestReservationsReadRepository } from '@/domain/reservation/repositories/guest-reservations-read.repository';
import { GuestLifecycleStatus } from '@/domain/guest/value-objects/guest-lifecycle-status.vo';

@QueryHandler(GetGuestLifecycleStatusQuery)
export class GetGuestLifecycleStatusHandler implements IQueryHandler<GetGuestLifecycleStatusQuery> {
  constructor(
    @Inject(GUEST_RESERVATIONS_READ_REPOSITORY)
    private readonly reservationRepository: GuestReservationsReadRepository,
  ) {}

  async execute(query: GetGuestLifecycleStatusQuery): Promise<Map<string, GuestLifecycleStatus>> {
    const { guestIds } = query;

    if (guestIds.length === 0) {
      return new Map();
    }

    return this.reservationRepository.getLifecycleStatusByGuestIds(guestIds);
  }
}