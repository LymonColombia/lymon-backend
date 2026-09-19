import { ICommand } from '@nestjs/cqrs';

export class AssociateSupplierToItemCommand implements ICommand {
  constructor(
    public readonly tenantId: string,
    public readonly propertyId: string,
    public readonly itemId: string,
    public readonly supplierId: string,
    public readonly actorId: string,
    public readonly actorEmail: string,
  ) {}
}
