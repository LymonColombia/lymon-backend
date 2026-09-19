import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  CONVERSATION_REPOSITORY,
} from '@/domain/conversation/repositories/conversation.repository';
import type {
  ConversationFilters,
  ConversationRepository,
} from '@/domain/conversation/repositories/conversation.repository';
import { GuestMessageChannel } from '@/domain/guest-message/value-objects/guest-message-channel.vo';
import { ConversationStatus } from '@/domain/conversation/value-objects/conversation-status.vo';
import { Conversation } from '@/domain/conversation/entities/conversation.entity';
import { GetConversationsByTenantQuery } from './get-conversations-by-tenant.query';
import {
  ConversationSummaryDto,
  GetConversationsByTenantResult,
} from './get-conversations-by-tenant.result';

@QueryHandler(GetConversationsByTenantQuery)
export class GetConversationsByTenantHandler
  implements IQueryHandler<GetConversationsByTenantQuery, GetConversationsByTenantResult>
{
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversationRepository: ConversationRepository,
  ) {}

  async execute(query: GetConversationsByTenantQuery): Promise<GetConversationsByTenantResult> {
    const filters: ConversationFilters = {};

    if (query.channel && Object.values(GuestMessageChannel).includes(query.channel as GuestMessageChannel)) {
      filters.channel = query.channel as GuestMessageChannel;
    }
    if (query.status && Object.values(ConversationStatus).includes(query.status as ConversationStatus)) {
      filters.status = query.status as ConversationStatus;
    }
    if (query.unreadOnly) {
      filters.unreadOnly = true;
    }

    const { conversations, total } = await this.conversationRepository.findByTenantPaginated(
      query.tenantId,
      filters,
      query.page,
      query.limit,
    );

    return new GetConversationsByTenantResult(
      conversations.map((c) => this.toDto(c)),
      total,
      query.page,
      query.limit,
    );
  }

  private toDto(c: Conversation): ConversationSummaryDto {
    return new ConversationSummaryDto(
      c.getId().toString(),
      c.getGuestId(),
      c.getReservationId(),
      c.getChannels(),
      c.getSubject(),
      c.getLastMessageAt(),
      c.getLastMessagePreview(),
      c.getUnreadCountForStaff(),
      c.getUnreadCountForGuest(),
      c.getStatus(),
      c.getCreatedAt(),
    );
  }
}
