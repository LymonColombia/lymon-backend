import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetExperienceByIdQuery } from './get-experience-by-id.query';
import { GetExperienceByIdResult } from './get-experience-by-id.result';
import {
  EXPERIENCE_REPOSITORY,
  type ExperienceRepository,
} from '@/domain/experience/repositories/experience.repository';
import {
  PROPERTY_REPOSITORY,
  type PropertyRepository,
} from '@/domain/property/repositories/property.repository';
import { ExperienceId } from '@/domain/experience/value-objects/experience-id.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { mapExperienceToPublicDto } from '@/application/experience/queries/shared/experience.mapper';
import {
  R2StorageService,
  R2_STORAGE_SERVICE,
} from '@/infrastructure/storage/r2-storage.service';

@QueryHandler(GetExperienceByIdQuery)
export class GetExperienceByIdQueryHandler implements IQueryHandler<
  GetExperienceByIdQuery,
  GetExperienceByIdResult
> {
  constructor(
    @Inject(EXPERIENCE_REPOSITORY)
    private readonly experienceRepository: ExperienceRepository,
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: PropertyRepository,
    @Inject(R2_STORAGE_SERVICE)
    private readonly storage: R2StorageService,
  ) {}

  async execute(
    query: GetExperienceByIdQuery,
  ): Promise<GetExperienceByIdResult> {
    const experience = await this.experienceRepository.findById(
      ExperienceId.create(query.experienceId),
    );

    if (!experience || experience.getTenantId().toString() !== query.tenantId) {
      throw new NotFoundException(
        `Experience with id "${query.experienceId}" not found`,
      );
    }

    const rawPropertyId = experience.getPropertyId();
    const property = await (rawPropertyId
      ? this.propertyRepository.findById(
          PropertyId.create(rawPropertyId.toString()),
        )
      : Promise.resolve(null));

    return new GetExperienceByIdResult(
      mapExperienceToPublicDto(experience, (k) => this.storage.getPublicUrl(k)),
      property?.getName() ?? null,
      [],
    );
  }
}
