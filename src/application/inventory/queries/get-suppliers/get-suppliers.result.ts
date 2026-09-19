export interface SupplierListItemDto {
  supplierId: string;
  name: string;
  contactEmail: string;
  contactPhone: string;
  country: string;
  city: string;
  nit: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
}

export class GetSuppliersResult {
  constructor(
    public readonly suppliers: SupplierListItemDto[],
    public readonly total: number,
    public readonly page: number,
    public readonly limit: number,
  ) {}

  get totalPages(): number {
    return Math.ceil(this.total / this.limit);
  }
}
