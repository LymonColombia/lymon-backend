import { Supplier } from '@/domain/inventory/entities/supplier.entity';
import { SupplierId } from '@/domain/inventory/value-objects/supplier-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { TENANT_FIXTURE_DEFAULTS } from '@test/shared/fixtures/tenant.fixture';

export const SUPPLIER_FIXTURE_DEFAULTS = {
  id: '65f1a1a2-b3c4-d5e6-f7a8-b9c400000000',
  tenantId: TENANT_FIXTURE_DEFAULTS.id,
  name: 'Fresh Supplies Inc.',
  contactEmail: 'contact@freshsupplies.com',
  contactPhone: '+12025550123',
  country: 'Colombia',
  city: 'Bogotá',
  nit: 'NIT-123456789',
};

export function makeSupplier(
  overrides?: Partial<{
    id: string;
    tenantId: string;
    name: string;
    contactEmail: string;
    contactPhone: string;
    country: string;
    city: string;
    nit: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
  }>,
): Supplier {
  const merged = { ...SUPPLIER_FIXTURE_DEFAULTS, ...overrides };

  return Supplier.reconstitute({
    id: SupplierId.create(merged.id),
    tenantId: TenantId.createFromString(merged.tenantId),
    name: merged.name,
    contactEmail: merged.contactEmail,
    contactPhone: merged.contactPhone,
    country: merged.country,
    city: merged.city,
    nit: merged.nit,
    createdAt: merged.createdAt ?? new Date(),
    updatedAt: merged.updatedAt ?? new Date(),
    deletedAt: merged.deletedAt ?? null,
  });
}
