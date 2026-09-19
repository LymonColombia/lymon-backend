import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { GuestEmailStatusEnum } from '@/domain/guest-email/value-objects/guest-email-status.vo';

export interface GuestEmailAttachment {
  url: string;
  name: string;
  type?: string;
}

export interface CreateGuestEmailParams {
  tenantId: TenantId;
  guestId: GuestId;
  subject: string;
  status: GuestEmailStatusEnum;
  messageId?: string;
  attachments?: GuestEmailAttachment[];
  sentById?: string;
}
