import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { GuestMessageAttachment, GuestMessageSentBy } from '../entities/guest-message.types';
import { GuestMessageChannel } from '../value-objects/guest-message-channel.vo';
import { GuestMessageDirection } from '../value-objects/guest-message-direction.vo';
import { GuestMessageId } from '../value-objects/guest-message-id.vo';
import { GuestMessageStatus } from '../value-objects/guest-message-status.vo';

export interface IGuestMessageData {
  id: GuestMessageId;
  tenantId: TenantId;
  guestId: GuestId;
  channel: GuestMessageChannel;
  direction: GuestMessageDirection;
  status: GuestMessageStatus;
  from: string;
  to: string[];
  reservationId: string | null;
  provider: string | null;
  providerMessageId: string | null;
  templateId: string | null;
  sentBy: GuestMessageSentBy;
  attachments: GuestMessageAttachment[];
  preview: string;
  body: string | null;
  bodyHtml: string | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  conversationId: string | null;
}
