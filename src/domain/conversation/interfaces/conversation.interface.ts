import { GuestMessageChannel } from '@/domain/guest-message/value-objects/guest-message-channel.vo';
import { ConversationId } from '../value-objects/conversation-id.vo';
import { ConversationStatus } from '../value-objects/conversation-status.vo';

export interface IConversationData {
  id: ConversationId;
  tenantId: string;
  guestId: string;
  reservationId: string | null;
  channels: GuestMessageChannel[];
  subject: string;
  lastMessageAt: Date;
  lastMessagePreview: string;
  unreadCountForStaff: number;
  unreadCountForGuest: number;
  status: ConversationStatus;
  createdAt: Date;
  updatedAt: Date;
}
