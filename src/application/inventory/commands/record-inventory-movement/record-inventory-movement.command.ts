import { ICommand } from '@nestjs/cqrs';

export class RecordInventoryMovementCommand implements ICommand {
  constructor(
    public readonly tenantId: string,
    public readonly propertyId: string,
    public readonly itemId: string,
    public readonly type: string,
    public readonly quantity: number,
    public readonly reason: string,
    public readonly reference: string | null,
    public readonly actorId: string,
    public readonly actorEmail: string,
  ) {}
}
