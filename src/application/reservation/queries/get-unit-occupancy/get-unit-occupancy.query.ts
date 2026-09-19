export class GetUnitOccupancyQuery {
  constructor(
    public readonly unitId: string,
    public readonly startDate: Date,
    public readonly endDate: Date,
  ) {}
}
