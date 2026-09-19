import { GuestMessageChannel } from '@/domain/guest-message/value-objects/guest-message-channel.vo';
import { Conversation } from '../entities/conversation.entity';
import { ConversationId } from '../value-objects/conversation-id.vo';
import { ConversationStatus } from '../value-objects/conversation-status.vo';

export const CONVERSATION_REPOSITORY = Symbol('ConversationRepository');

export interface ConversationFilters {
  channel?: GuestMessageChannel;
  status?: ConversationStatus;
  unreadOnly?: boolean;
}

export interface ConversationRepository {
  save(conversation: Conversation): Promise<void>;
  findById(id: ConversationId): Promise<Conversation | null>;
  findByTenantAndGuest(tenantId: string, guestId: string): Promise<Conversation | null>;
  findByTenantPaginated(
    tenantId: string,
    filters: ConversationFilters,
    page: number,
    limit: number,
  ): Promise<{ conversations: Conversation[]; total: number }>;
  findByGuestId(tenantId: string, guestId: string): Promise<Conversation[]>;
}
