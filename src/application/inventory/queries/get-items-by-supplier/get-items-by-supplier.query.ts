import { IQuery } from '@nestjs/cqrs';

export class GetItemsBySupplierQuery implements IQuery {
  constructor(
    public readonly tenantId: string,
    public readonly supplierId: string,
    public readonly page: number = 1,
    public readonly limit: number = 20,
  ) {}
}
