import { ExperiencePurchaseStatusEnum } from '@/domain/experience-purchase/value-objects/experience-purchase-status.vo';

export class GetExperiencePurchasesByTenantQuery {
  constructor(
    readonly tenantId: string,
    readonly page: number = 1,
    readonly limit: number = 20,
    readonly experienceId?: string,
    readonly dateFrom?: string,
    readonly dateTo?: string,
    readonly status?: ExperiencePurchaseStatusEnum,
  ) {}
}
