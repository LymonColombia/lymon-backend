import { ICommand } from '@nestjs/cqrs';

export class UpdateInventoryItemCommand implements ICommand {
  constructor(
    public readonly tenantId: string,
    public readonly propertyId: string,
    public readonly itemId: string,
    public readonly name: string | undefined,
    public readonly categoryId: string | undefined,
    public readonly unit: string | undefined,
    public readonly minStock: number | undefined,
    public readonly currentStock: number | undefined,
    public readonly actorId: string,
    public readonly actorEmail: string,
  ) {}
}
