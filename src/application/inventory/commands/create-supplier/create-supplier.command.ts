import { ICommand } from '@nestjs/cqrs';

export class CreateSupplierCommand implements ICommand {
  constructor(
    public readonly tenantId: string,
    public readonly name: string,
    public readonly contactEmail: string,
    public readonly contactPhone: string,
    public readonly country: string,
    public readonly city: string,
    public readonly nit: string,
    public readonly actorId: string,
    public readonly actorEmail: string,
  ) {}
}
