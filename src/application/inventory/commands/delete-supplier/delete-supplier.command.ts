import { ICommand } from '@nestjs/cqrs';

export class DeleteSupplierCommand implements ICommand {
  constructor(
    public readonly tenantId: string,
    public readonly supplierId: string,
    public readonly actorId: string,
    public readonly actorEmail: string,
  ) {}
}
