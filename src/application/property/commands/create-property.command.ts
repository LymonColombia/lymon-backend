export class CreatePropertyCommand {
  constructor(
    public readonly tenantId: string,
    public readonly name: string,
    public readonly description: string,
    public readonly propertyType: string,
    public readonly address: string,
    public readonly city: string,
    public readonly state: string,
    public readonly country: string,
    public readonly zipCode: string,
    public readonly location: { lat: number; lng: number },
    public readonly checkInTime: string,
    public readonly checkOutTime: string,
    public readonly cancellationPolicy: string,
    public readonly hostPhone: string,
    public readonly hostEmail: string,
    public readonly autoCreateUnit: boolean,
    public readonly actorId: string,
    public readonly actorEmail: string,
    public readonly imageKey?: string,
  ) {}
}
