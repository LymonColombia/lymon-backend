import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetExperiencesByTenantQuery } from './get-experiences-by-tenant.query';
import { GetExperiencesByTenantResult } from './get-experiences-by-tenant.result';
import {
  EXPERIENCE_REPOSITORY,
  type ExperienceRepository,
} from '@/domain/experience/repositories/experience.repository';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { mapExperienceToPublicDto } from '@/application/experience/queries/shared/experience.mapper';
import {
  R2StorageService,
  R2_STORAGE_SERVICE,
} from '@/infrastructure/storage/r2-storage.service';

@QueryHandler(GetExperiencesByTenantQuery)
export class GetExperiencesByTenantQueryHandler implements IQueryHandler<
  GetExperiencesByTenantQuery,
  GetExperiencesByTenantResult
> {
  constructor(
    @Inject(EXPERIENCE_REPOSITORY)
    private readonly experienceRepository: ExperienceRepository,
    @Inject(R2_STORAGE_SERVICE)
    private readonly storage: R2StorageService,
  ) {}

  async execute(
    query: GetExperiencesByTenantQuery,
  ): Promise<GetExperiencesByTenantResult> {
    const tenantId = TenantId.createFromString(query.tenantId);
    const propertyId = query.propertyId
      ? PropertyId.create(query.propertyId)
      : undefined;

    const { experiences, total } =
      await this.experienceRepository.findByTenantIdPaginated(
        tenantId,
        query.page,
        query.limit,
        propertyId,
        query.minCapacity,
      );

    return new GetExperiencesByTenantResult(
      experiences.map((exp) =>
        mapExperienceToPublicDto(exp, (k) => this.storage.getPublicUrl(k)),
      ),
      total,
      query.page,
      query.limit,
    );
  }
}
