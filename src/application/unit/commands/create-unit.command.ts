export class CreateUnitCommand {
  constructor(
    public readonly tenantId: string,
    public readonly propertyId: string,
    public readonly name: string,
    public readonly description: string,
    public readonly inventoryCount: number,
    public readonly maxGuests: number,
    public readonly standardGuests: number,
    public readonly bedrooms: Array<{
      roomName: string;
      beds: Array<{ type: string; count: number }>;
    }>,
    public readonly bathroomsCount: number,
    public readonly isShared: boolean,
    public readonly amenities: string[],
    public readonly pricePerNight: number,
    public readonly externalIds?: {
      airbnbId?: string;
      bookingId?: string;
      vrboId?: string;
    },
    public readonly actorId?: string,
    public readonly actorEmail?: string,
    public readonly mediaKeys?: string[],
  ) {}
}
