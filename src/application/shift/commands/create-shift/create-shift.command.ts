export class CreateShiftCommand {
  constructor(
    public readonly tenantId: string,
    public readonly staffMemberIds: string[],
    public readonly propertyId: string,
    public readonly startDate: string,
    public readonly endDate: string | null,
    public readonly startHour: string,
    public readonly endHour: string,
    public readonly name: string,
    public readonly weekdays?: number[],
    public readonly notes?: string,
    public readonly actorId?: string,
    public readonly actorEmail?: string,
  ) {}
}
