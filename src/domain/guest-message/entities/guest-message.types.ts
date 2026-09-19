import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { GuestMessageChannel } from '../value-objects/guest-message-channel.vo';
import { GuestMessageDirection } from '../value-objects/guest-message-direction.vo';
import { GuestMessageStatus } from '../value-objects/guest-message-status.vo';

export interface GuestMessageAttachment {
  url: string;
  name: string;
  type?: string;
}

export interface GuestMessageSentBy {
  actorId: string;
  actorEmail: string;
}

export interface CreateGuestMessageParams {
  tenantId: TenantId;
  guestId: GuestId;
  channel: GuestMessageChannel;
  direction: GuestMessageDirection;
  status: GuestMessageStatus;
  from: string;
  to: string[];
  reservationId?: string;
  provider?: string;
  providerMessageId?: string;
  templateId?: string;
  sentBy: GuestMessageSentBy;
  attachments?: GuestMessageAttachment[];
  preview: string;
  body?: string | null;
  bodyHtml?: string | null;
  failureReason?: string;
  conversationId?: string | null;
}
