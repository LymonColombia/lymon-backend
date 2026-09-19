import { SupplierId } from '@/domain/inventory/value-objects/supplier-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

export interface ISupplier {
  id: SupplierId;
  tenantId: TenantId;
  name: string;
  contactEmail: string;
  contactPhone: string;
  country: string;
  city: string;
  nit: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
