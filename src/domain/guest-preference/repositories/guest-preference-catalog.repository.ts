import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { GuestPreferenceCatalogItem } from '@/domain/guest-preference/entities/guest-preference-catalog-item.entity';

export interface GuestPreferenceCatalogRepository {
  save(item: GuestPreferenceCatalogItem): Promise<string>;
  findByTenant(tenantId: TenantId): Promise<GuestPreferenceCatalogItem[]>;
  findById(id: string): Promise<GuestPreferenceCatalogItem | null>;
  delete(id: string): Promise<void>;
}

export const GUEST_PREFERENCE_CATALOG_REPOSITORY =
  'GUEST_PREFERENCE_CATALOG_REPOSITORY';
