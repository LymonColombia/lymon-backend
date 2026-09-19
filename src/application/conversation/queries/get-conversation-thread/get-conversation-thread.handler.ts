import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  CONVERSATION_REPOSITORY,
} from '@/domain/conversation/repositories/conversation.repository';
import type { ConversationRepository } from '@/domain/conversation/repositories/conversation.repository';
import {
  GUEST_MESSAGE_REPOSITORY,
} from '@/domain/guest-message/repositories/guest-message.repository';
import type { GuestMessageRepository } from '@/domain/guest-message/repositories/guest-message.repository';
import {
  MESSAGE_BODY_PROVIDER,
} from '@/application/shared/services/message-body-provider.service';
import type { IMessageBodyProvider } from '@/application/shared/services/message-body-provider.service';
import { ConversationId } from '@/domain/conversation/value-objects/conversation-id.vo';
import { Conversation } from '@/domain/conversation/entities/conversation.entity';
import { GuestMessage } from '@/domain/guest-message/entities/guest-message.entity';
import {
  ConversationSummaryDto,
} from '../get-conversations-by-tenant/get-conversations-by-tenant.result';
import { GetConversationThreadQuery } from './get-conversation-thread.query';
import {
  ConversationMessageDto,
  ConversationThreadResult,
} from './get-conversation-thread.result';

@QueryHandler(GetConversationThreadQuery)
export class GetConversationThreadHandler
  implements IQueryHandler<GetConversationThreadQuery, ConversationThreadResult>
{
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversationRepository: ConversationRepository,
    @Inject(GUEST_MESSAGE_REPOSITORY)
    private readonly guestMessageRepository: GuestMessageRepository,
    @Inject(MESSAGE_BODY_PROVIDER)
    private readonly messageBodyProvider: IMessageBodyProvider,
  ) {}

  async execute(query: GetConversationThreadQuery): Promise<ConversationThreadResult> {
    const conversation = await this.conversationRepository.findById(
      ConversationId.createFromString(query.conversationId),
    );

    if (conversation?.getTenantId() !== query.tenantId) {
      throw new NotFoundException('Conversation not found');
    }

    const messages = await this.guestMessageRepository.findByConversationId(
      query.tenantId,
      query.conversationId,
    );

    const messageDtos = await Promise.all(
      messages.map((msg) => this.toMessageDto(msg)),
    );

    return new ConversationThreadResult(
      this.toConversationDto(conversation),
      messageDtos,
    );
  }

  private async toMessageDto(msg: GuestMessage): Promise<ConversationMessageDto> {
    const providerMessageId = msg.getProviderMessageId();
    let body: string | null = msg.getPreview();
    let bodyResolved = false;

    if (providerMessageId) {
      try {
        const resolved = await this.messageBodyProvider.getBody(providerMessageId);
        if (resolved !== null) {
          body = resolved;
          bodyResolved = true;
        }
      } catch {
        // fall back to preview
      }
    }

    return new ConversationMessageDto(
      msg.getId().toString(),
      msg.getDirection(),
      msg.getChannel(),
      msg.getStatus(),
      msg.getPreview(),
      body,
      bodyResolved,
      msg.getSentBy(),
      msg.getAttachments(),
      msg.getCreatedAt(),
    );
  }

  private toConversationDto(c: Conversation): ConversationSummaryDto {
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
