export class PropertyFullDto {
  constructor(
    public readonly id: string,
    public readonly slug: string,
    public readonly name: string,
    public readonly description: string,
    public readonly propertyType: string,
    public readonly address: string,
    public readonly city: string,
    public readonly state: string,
    public readonly country: string,
    public readonly zipCode: string,
    public readonly location: { lat: number; lng: number } | null,
    public readonly checkInTime: string,
    public readonly checkOutTime: string,
    public readonly cancellationPolicy: string,
    public readonly hostPhone: string,
    public readonly hostEmail: string,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    public readonly imageUrl: string | null,
  ) {}
}

export class GetPropertyByIdResult {
  constructor(public readonly property: PropertyFullDto | null) {}
}
