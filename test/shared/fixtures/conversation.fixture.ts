import { Conversation } from '@/domain/conversation/entities/conversation.entity';
import { ConversationId } from '@/domain/conversation/value-objects/conversation-id.vo';
import { ConversationStatus } from '@/domain/conversation/value-objects/conversation-status.vo';
import { GuestMessageChannel } from '@/domain/guest-message/value-objects/guest-message-channel.vo';

export const CONVERSATION_FIXTURE_DEFAULTS = {
  id: 'conv-1234-5678-abcd-ef1234567890',
  tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
  guestId: '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000',
  reservationId: null as string | null,
  channels: [GuestMessageChannel.EMAIL],
  subject: 'Test conversation',
  lastMessageAt: new Date('2026-01-01T10:00:00Z'),
  lastMessagePreview: 'Hello, this is a test message',
  unreadCountForStaff: 0,
  unreadCountForGuest: 0,
  status: ConversationStatus.OPEN,
  createdAt: new Date('2026-01-01T10:00:00Z'),
  updatedAt: new Date('2026-01-01T10:00:00Z'),
};

export function makeConversation(
  overrides?: Partial<typeof CONVERSATION_FIXTURE_DEFAULTS>,
): Conversation {
  const merged = { ...CONVERSATION_FIXTURE_DEFAULTS, ...overrides };
  return Conversation.reconstitute({
    id: ConversationId.createFromString(merged.id),
    tenantId: merged.tenantId,
    guestId: merged.guestId,
    reservationId: merged.reservationId,
    channels: merged.channels,
    subject: merged.subject,
    lastMessageAt: merged.lastMessageAt,
    lastMessagePreview: merged.lastMessagePreview,
    unreadCountForStaff: merged.unreadCountForStaff,
    unreadCountForGuest: merged.unreadCountForGuest,
    status: merged.status,
    createdAt: merged.createdAt,
    updatedAt: merged.updatedAt,
  });
}
