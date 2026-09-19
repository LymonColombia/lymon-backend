import { IQuery } from '@nestjs/cqrs';

export class GetExperiencesByTenantQuery implements IQuery {
  constructor(
    public readonly tenantId: string,
    public readonly page: number = 1,
    public readonly limit: number = 10,
    public readonly propertyId?: string,
    public readonly minCapacity?: number,
  ) {}
}
