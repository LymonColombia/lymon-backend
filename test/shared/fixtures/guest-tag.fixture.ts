import { GuestTag } from '@/domain/guest-tag/entities/guest-tag.entity';
import { GuestTagId } from '@/domain/guest-tag/value-objects/guest-tag-id.vo';

export const GUEST_TAG_FIXTURE_DEFAULTS = {
  id: '65f1a1a2-b3c4-d5e6-f700-000100000000',
  tenantId: '__platform__',
};

export function makeGuestTag(
  overrides?: Partial<{ id: string; tenantId: string; name: string }>,
): GuestTag {
  const merged = {
    id: GUEST_TAG_FIXTURE_DEFAULTS.id,
    tenantId: GUEST_TAG_FIXTURE_DEFAULTS.tenantId,
    name: 'vip',
    ...overrides,
  };

  return GuestTag.reconstitute(
    GuestTagId.createFromString(merged.id),
    merged.tenantId,
    merged.name,
    new Date('2024-01-01'),
  );
}
