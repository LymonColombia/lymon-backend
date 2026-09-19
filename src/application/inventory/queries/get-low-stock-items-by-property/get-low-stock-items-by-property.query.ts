import { IQuery } from '@nestjs/cqrs';

export class GetLowStockItemsByPropertyQuery implements IQuery {
  constructor(
    public readonly tenantId: string,
    public readonly propertyId: string,
  ) {}
}
