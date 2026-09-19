import { Inject, NotFoundException } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetUnitRatingsQuery } from './get-unit-ratings.query';
import { GetUnitRatingsResult, UnitRatingDto } from './get-unit-ratings.result';
import {
  UNIT_RATING_REPOSITORY,
  type UnitRatingRepository,
} from '@/domain/unit-rating/repositories/unit-rating.repository';
import {
  UNIT_REPOSITORY,
  type UnitRepository,
} from '@/domain/unit/repositories/unit.repository';
import {
  GUEST_REPOSITORY,
  type GuestRepository,
} from '@/domain/guest/repositories/guest.repository';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';

@QueryHandler(GetUnitRatingsQuery)
export class GetUnitRatingsHandler implements IQueryHandler<GetUnitRatingsQuery> {
  constructor(
    @Inject(UNIT_RATING_REPOSITORY)
    private readonly unitRatingRepository: UnitRatingRepository,
    @Inject(UNIT_REPOSITORY)
    private readonly unitRepository: UnitRepository,
    @Inject(GUEST_REPOSITORY)
    private readonly guestRepository: GuestRepository,
  ) {}

  async execute(query: GetUnitRatingsQuery): Promise<GetUnitRatingsResult> {
    const unitId = UnitId.create(query.unitId);

    const unit = await this.unitRepository.findById(unitId);
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }
    if (query.tenantId && unit.getTenantId().toString() !== query.tenantId) {
      throw new NotFoundException('Unit not found');
    }

    const { ratings, total } =
      await this.unitRatingRepository.findByUnitIdPaginated(
        unitId,
        query.page,
        query.limit,
        query.sort,
        query.filterRate,
      );

    const guests = await Promise.all(
      ratings.map((r) =>
        this.guestRepository.findById(GuestId.createFromString(r.getGuestId().toString())),
      ),
    );

    const dtos = ratings.map(
      (r, i) =>
        new UnitRatingDto(
          r.getId()!.toString(),
          r.getUnitId().toString(),
          r.getGuestId().toString(),
          guests[i]?.getFullName() ?? 'Unknown',
          r.getReservationId().toString(),
          r.getRate(),
          r.getMessage(),
          r.getCreatedAt(),
        ),
    );

    return new GetUnitRatingsResult(dtos, total, query.page, query.limit);
  }
}
