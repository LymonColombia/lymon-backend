import { BadRequestException, Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetAvailableExperiencesQuery } from './get-available-experiences.query';
import { GetAvailableExperiencesResult } from './get-available-experiences.result';
import {
  EXPERIENCE_REPOSITORY,
  type ExperienceRepository,
} from '@/domain/experience/repositories/experience.repository';
import { ExperienceCategory } from '@/domain/experience/value-objects/experience-category.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { mapExperienceToPublicDto } from '@/application/experience/queries/shared/experience.mapper';
import {
  R2StorageService,
  R2_STORAGE_SERVICE,
} from '@/infrastructure/storage/r2-storage.service';

function createOptionalFilter<T>(
  value: string | undefined,
  fieldName: string,
  factory: (v: string) => T,
): T | undefined {
  if (!value?.trim()) return undefined;

  try {
    return factory(value);
  } catch {
    throw new BadRequestException(`Invalid ${fieldName}`);
  }
}

@QueryHandler(GetAvailableExperiencesQuery)
export class GetAvailableExperiencesQueryHandler implements IQueryHandler<
  GetAvailableExperiencesQuery,
  GetAvailableExperiencesResult
> {
  constructor(
    @Inject(EXPERIENCE_REPOSITORY)
    private readonly experienceRepository: ExperienceRepository,
    @Inject(R2_STORAGE_SERVICE)
    private readonly storage: R2StorageService,
  ) {}

  async execute(
    query: GetAvailableExperiencesQuery,
  ): Promise<GetAvailableExperiencesResult> {
    const tenantId = createOptionalFilter(query.tenantId, 'tenantId', (v) =>
      TenantId.createFromString(v),
    );
    const propertyId = createOptionalFilter(
      query.propertyId,
      'propertyId',
      (v) => PropertyId.create(v),
    );
    const category = createOptionalFilter(query.category, 'category', (v) =>
      ExperienceCategory.create(v),
    );

    const { experiences, total } =
      await this.experienceRepository.findAvailableForGuestPaginated(
        {
          tenantId,
          propertyId,
          category,
          sortByPrice: query.sortByPrice,
          scope: query.scope,
          city: query.city,
        },
        query.page,
        query.limit,
      );

    return new GetAvailableExperiencesResult(
      experiences.map((exp) =>
        mapExperienceToPublicDto(exp, (k) => this.storage.getPublicUrl(k)),
      ),
      total,
      query.page,
      query.limit,
    );
  }
}
