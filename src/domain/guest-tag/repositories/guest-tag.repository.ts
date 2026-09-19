import type { GuestTag } from '@/domain/guest-tag/entities/guest-tag.entity';

export const GUEST_TAG_REPOSITORY = 'GUEST_TAG_REPOSITORY';

export interface GuestTagRepository {
  save(tag: GuestTag): Promise<void>;
  findAll(tenantId: string): Promise<GuestTag[]>;
  findByNames(names: string[], tenantId: string): Promise<GuestTag[]>;
  existsByTenantIdAndName(tenantId: string, name: string): Promise<boolean>;
}
