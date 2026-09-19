import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { GuestMessage } from '../entities/guest-message.entity';
import { GuestMessageId } from '../value-objects/guest-message-id.vo';

export interface GuestMessageRepository {
  save(message: GuestMessage): Promise<void>;
  findById(id: GuestMessageId): Promise<GuestMessage | null>;
  findByGuestId(tenantId: TenantId, guestId: GuestId): Promise<GuestMessage[]>;
  findByGuestIdPaginated(
    tenantId: TenantId,
    guestId: GuestId,
    page: number,
    limit: number,
  ): Promise<{ messages: GuestMessage[]; total: number }>;
  findByProviderMessageId(providerMessageId: string): Promise<GuestMessage | null>;
  findByConversationId(tenantId: string, conversationId: string): Promise<GuestMessage[]>;
}

export const GUEST_MESSAGE_REPOSITORY = Symbol('GuestMessageRepository');
