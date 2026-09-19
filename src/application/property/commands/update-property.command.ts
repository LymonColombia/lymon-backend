export class UpdatePropertyCommand {
  constructor(
    public readonly tenantId: string,
    public readonly propertyId: string,
    public readonly name: string | undefined,
    public readonly description: string | undefined,
    public readonly address: string | undefined,
    public readonly city: string | undefined,
    public readonly state: string | undefined,
    public readonly country: string | undefined,
    public readonly zipCode: string | undefined,
    public readonly location: { lat: number; lng: number } | undefined,
    public readonly checkInTime: string | undefined,
    public readonly checkOutTime: string | undefined,
    public readonly cancellationPolicy: string | undefined,
    public readonly hostPhone: string | undefined,
    public readonly hostEmail: string | undefined,
    public readonly actorId: string,
    public readonly actorEmail: string,
    public readonly imageKey?: string,
  ) {}
}
