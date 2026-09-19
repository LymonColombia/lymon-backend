import { IQuery } from '@nestjs/cqrs';

export class GetPublicUnitsByTenantQuery implements IQuery {
  constructor(
    public readonly tenantSlug: string,
    public readonly page: number = 1,
    public readonly limit: number = 10,
    public readonly minGuests?: number,
    public readonly startDate?: Date,
    public readonly endDate?: Date,
  ) {}
}
