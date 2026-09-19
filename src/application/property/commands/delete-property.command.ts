export class DeletePropertyCommand {
  constructor(
    public readonly propertyId: string,
    public readonly tenantId: string,
    public readonly actorId: string,
    public readonly actorEmail: string,
  ) {}
}
