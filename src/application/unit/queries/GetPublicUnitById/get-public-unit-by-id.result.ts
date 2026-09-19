import { PublicUnitDto } from '@/application/unit/queries/GetPublicUnitsByTenant/get-public-units-by-tenant.result';

export class GetPublicUnitByIdResult {
  constructor(public readonly unit: PublicUnitDto) {}
}
