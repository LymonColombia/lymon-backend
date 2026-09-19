import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import {
  EXPERIENCE_PURCHASE_REPOSITORY,
  type ExperiencePurchaseRepository,
  type TenantExperiencePurchaseFilters,
} from '@/domain/experience-purchase/repositories/experience-purchase.repository';
import { GetExperiencePurchasesByTenantQuery } from './get-experience-purchases-by-tenant.query';
import { GetExperiencePurchasesByTenantResult } from './get-experience-purchases-by-tenant.result';

@QueryHandler(GetExperiencePurchasesByTenantQuery)
export class GetExperiencePurchasesByTenantHandler implements IQueryHandler<GetExperiencePurchasesByTenantQuery> {
  constructor(
    @Inject(EXPERIENCE_PURCHASE_REPOSITORY)
    private readonly purchaseRepository: ExperiencePurchaseRepository,
  ) {}

  async execute(
    query: GetExperiencePurchasesByTenantQuery,
  ): Promise<GetExperiencePurchasesByTenantResult> {
    const tenantId = TenantId.createFromString(query.tenantId);
    const filters = this.buildFilters(query);

    const [purchases, total] = await Promise.all([
      this.purchaseRepository.findByTenantIdPaginated(
        tenantId,
        query.page,
        query.limit,
        filters,
      ),
      this.purchaseRepository.countByTenantId(tenantId, filters),
    ]);

    return new GetExperiencePurchasesByTenantResult(
      purchases,
      total,
      query.page,
      query.limit,
    );
  }

  private buildFilters(
    query: GetExperiencePurchasesByTenantQuery,
  ): TenantExperiencePurchaseFilters {
    return {
      experienceId: query.experienceId,
      dateFrom: query.dateFrom ? new Date(query.dateFrom) : undefined,
      dateTo: query.dateTo ? new Date(query.dateTo) : undefined,
      status: query.status,
    };
  }
}
