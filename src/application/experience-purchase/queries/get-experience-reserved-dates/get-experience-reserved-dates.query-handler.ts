import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetExperienceReservedDatesQuery } from './get-experience-reserved-dates.query';
import {
  EXPERIENCE_PURCHASE_REPOSITORY,
  type ExperiencePurchaseRepository,
} from '@/domain/experience-purchase/repositories/experience-purchase.repository';
import { ExperienceId } from '@/domain/experience/value-objects/experience-id.vo';

@QueryHandler(GetExperienceReservedDatesQuery)
export class GetExperienceReservedDatesQueryHandler implements IQueryHandler<
  GetExperienceReservedDatesQuery,
  { reservedDates: Date[] }
> {
  constructor(
    @Inject(EXPERIENCE_PURCHASE_REPOSITORY)
    private readonly purchaseRepository: ExperiencePurchaseRepository,
  ) {}

  async execute(
    query: GetExperienceReservedDatesQuery,
  ): Promise<{ reservedDates: Date[] }> {
    const reservedDates =
      await this.purchaseRepository.findReservedDatesByExperienceId(
        ExperienceId.create(query.experienceId),
        query.dateFrom,
        query.dateTo,
      );

    return { reservedDates };
  }
}
