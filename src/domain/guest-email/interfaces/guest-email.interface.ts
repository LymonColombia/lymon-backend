import { GuestEmailId } from '@/domain/guest-email/value-objects/guest-email-id.vo';
import { GuestEmailStatusEnum } from '@/domain/guest-email/value-objects/guest-email-status.vo';
import { GuestEmailAttachment } from '@/domain/guest-email/entities/guest-email.types';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';

export interface IGuestEmailData {
  id: GuestEmailId;
  tenantId: TenantId;
  guestId: GuestId;
  subject: string;
  status: GuestEmailStatusEnum;
  attachments: GuestEmailAttachment[];
  messageId: string | null;
  sentById: string | null;
  createdAt: Date;
}
