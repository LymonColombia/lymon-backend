import { ICommand } from '@nestjs/cqrs';

export class RemoveSupplierFromItemCommand implements ICommand {
  constructor(
    public readonly tenantId: string,
    public readonly propertyId: string,
    public readonly itemId: string,
    public readonly actorId: string,
    public readonly actorEmail: string,
  ) {}
}
