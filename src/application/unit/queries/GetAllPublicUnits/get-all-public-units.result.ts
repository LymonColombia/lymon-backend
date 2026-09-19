import { PublicUnitDto } from '@/application/unit/queries/GetPublicUnitsByTenant/get-public-units-by-tenant.result';

export class GetAllPublicUnitsResult {
  constructor(
    public readonly units: PublicUnitDto[],
    public readonly total: number,
    public readonly page: number,
    public readonly limit: number,
  ) {}

  get totalPages(): number {
    return Math.ceil(this.total / this.limit);
  }
}
