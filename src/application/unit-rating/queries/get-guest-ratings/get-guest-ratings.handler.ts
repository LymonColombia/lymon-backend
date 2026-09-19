import { Inject } from '@nestjs/common';
import { QueryHandler, IQueryHandler } from '@nestjs/cqrs';
import { GetGuestRatingsQuery } from './get-guest-ratings.query';
import {
  GetGuestRatingsResult,
  GuestRatingDto,
} from './get-guest-ratings.result';
import {
  UNIT_RATING_REPOSITORY,
  type UnitRatingRepository,
} from '@/domain/unit-rating/repositories/unit-rating.repository';
import {
  UNIT_REPOSITORY,
  type UnitRepository,
} from '@/domain/unit/repositories/unit.repository';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';

@QueryHandler(GetGuestRatingsQuery)
export class GetGuestRatingsHandler
  implements IQueryHandler<GetGuestRatingsQuery>
{
  constructor(
    @Inject(UNIT_RATING_REPOSITORY)
    private readonly unitRatingRepository: UnitRatingRepository,
    @Inject(UNIT_REPOSITORY)
    private readonly unitRepository: UnitRepository,
  ) {}

  async execute(query: GetGuestRatingsQuery): Promise<GetGuestRatingsResult> {
    const guestId = GuestId.createFromString(query.guestId);

    const [{ ratings, total }, averageRating] = await Promise.all([
      this.unitRatingRepository.findByGuestIdPaginated(
        guestId,
        query.page,
        query.limit,
      ),
      this.unitRatingRepository.calculateAverageForGuest(guestId),
    ]);

    const dtos = await Promise.all(
      ratings.map(async (rating) => {
        const unit = await this.unitRepository.findById(rating.getUnitId());
        return new GuestRatingDto(
          rating.getId()!.toString(),
          rating.getUnitId().toString(),
          unit?.getName() ?? 'Unknown',
          rating.getRate(),
          rating.getMessage(),
          rating.getCreatedAt(),
        );
      }),
    );

    return new GetGuestRatingsResult(dtos, total, query.page, query.limit, averageRating);
  }
}
