import { IQuery } from '@nestjs/cqrs';

export type SupplierSortBy = 'name' | 'createdAt';
export type SupplierSortOrder = 'asc' | 'desc';

export class GetSuppliersQuery implements IQuery {
  constructor(
    public readonly tenantId: string,
    public readonly page: number = 1,
    public readonly limit: number = 10,
    public readonly search?: string,
    public readonly sortBy: SupplierSortBy = 'createdAt',
    public readonly sortOrder: SupplierSortOrder = 'desc',
  ) {}
}
