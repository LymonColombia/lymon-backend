import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  CONVERSATION_REPOSITORY,
} from '@/domain/conversation/repositories/conversation.repository';
import type { ConversationRepository } from '@/domain/conversation/repositories/conversation.repository';
import { Conversation } from '@/domain/conversation/entities/conversation.entity';
import {
  ConversationSummaryDto,
} from '../get-conversations-by-tenant/get-conversations-by-tenant.result';
import { GetConversationsByGuestIdQuery } from './get-conversations-by-guest-id.query';
import { GetConversationsByGuestIdResult } from './get-conversations-by-guest-id.result';

@QueryHandler(GetConversationsByGuestIdQuery)
export class GetConversationsByGuestIdHandler
  implements IQueryHandler<GetConversationsByGuestIdQuery, GetConversationsByGuestIdResult>
{
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversationRepository: ConversationRepository,
  ) {}

  async execute(query: GetConversationsByGuestIdQuery): Promise<GetConversationsByGuestIdResult> {
    const conversations = await this.conversationRepository.findByGuestId(
      query.tenantId,
      query.guestId,
    );

    return new GetConversationsByGuestIdResult(
      conversations.map((c) => this.toDto(c)),
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
