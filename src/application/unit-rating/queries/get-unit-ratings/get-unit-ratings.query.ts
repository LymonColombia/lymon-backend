export class GetUnitRatingsQuery {
  constructor(
    public readonly tenantId: string,
    public readonly unitId: string,
    public readonly page: number,
    public readonly limit: number,
    public readonly sort?: 'best' | 'worst',
    public readonly filterRate?: number,
  ) {}
}
