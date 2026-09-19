export class UpdateUnitCommand {
  constructor(
    public readonly tenantId: string,
    public readonly unitId: string,
    public readonly name: string | undefined,
    public readonly description: string | undefined,
    public readonly inventoryCount: number | undefined,
    public readonly maxGuests: number | undefined,
    public readonly standardGuests: number | undefined,
    public readonly bedrooms:
      | Array<{
          roomName: string;
          beds: Array<{ type: string; count: number }>;
        }>
      | undefined,
    public readonly bathroomsCount: number | undefined,
    public readonly isShared: boolean | undefined,
    public readonly amenities: string[] | undefined,
    public readonly mediaKeys: string[] | undefined,
    public readonly pricePerNight: number | undefined,
    public readonly externalIds:
      | {
          airbnbId?: string;
          bookingId?: string;
          vrboId?: string;
        }
      | undefined,
    public readonly actorId?: string,
    public readonly actorEmail?: string,
  ) {}
}
