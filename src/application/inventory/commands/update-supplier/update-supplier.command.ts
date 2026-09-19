import { ICommand } from '@nestjs/cqrs';

export class UpdateSupplierCommand implements ICommand {
  constructor(
    public readonly tenantId: string,
    public readonly supplierId: string,
    public readonly name: string | undefined,
    public readonly contactEmail: string | undefined,
    public readonly contactPhone: string | undefined,
    public readonly country: string | undefined,
    public readonly city: string | undefined,
    public readonly nit: string | undefined,
    public readonly actorId?: string,
    public readonly actorEmail?: string,
  ) {}
}
