import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import {
  GuestIdentity,
  GuestStatusEnum,
  GuestSummary,
} from '@/domain/guest/entities/guest.types';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { GuestPreferenceItem } from '@/domain/guest/value-objects/guest-preference-item.vo';
import { GuestTag } from '@/domain/guest-tag/entities/guest-tag.entity';

export interface IGuestData {
  id: GuestId;
  tenantId: TenantId;
  guestAccountId: GuestAccountId | null;
  identity: GuestIdentity;
  firstName: string | null;
  lastName: string | null;
  fullName: string;
  primaryEmail: string;
  phone: string | null;
  status: GuestStatusEnum;
  tags: GuestTag[];
  preferences: GuestPreferenceItem[];
  summary: GuestSummary;
  createdAt: Date;
  updatedAt: Date;
  pendingEmail?: string | null;
  emailChangeToken?: string | null;
  emailChangeExpiry?: Date | null;
}
