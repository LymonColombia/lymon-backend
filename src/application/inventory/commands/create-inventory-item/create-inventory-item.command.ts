import { ICommand } from '@nestjs/cqrs';

export class CreateInventoryItemCommand implements ICommand {
  constructor(
    public readonly tenantId: string,
    public readonly propertyId: string,
    public readonly sku: string,
    public readonly name: string,
    public readonly categoryId: string,
    public readonly unit: string,
    public readonly minStock: number,
    public readonly initialStock: number,
    public readonly actorId: string,
    public readonly actorEmail: string,
  ) {}
}
