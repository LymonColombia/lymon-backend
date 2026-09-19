export interface GetShiftsFilters {
  dateFrom?: Date;
  dateTo?: Date;
  propertyId?: string;
}

export class GetShiftsQuery {
  constructor(
    public readonly tenantId: string,
    public readonly filters: GetShiftsFilters,
    public readonly actorUserId: string,
    public readonly canViewAllStaff: boolean,
    public readonly staffMemberId?: string,
  ) {}
}
