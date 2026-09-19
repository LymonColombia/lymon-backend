import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  CONVERSATION_REPOSITORY,
} from '@/domain/conversation/repositories/conversation.repository';
import type { ConversationRepository } from '@/domain/conversation/repositories/conversation.repository';
import { ConversationId } from '@/domain/conversation/value-objects/conversation-id.vo';
import { ArchiveConversationCommand } from './archive-conversation.command';

@CommandHandler(ArchiveConversationCommand)
export class ArchiveConversationHandler
  implements ICommandHandler<ArchiveConversationCommand>
{
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversationRepository: ConversationRepository,
  ) {}

  async execute(command: ArchiveConversationCommand): Promise<void> {
    const conversation = await this.conversationRepository.findById(
      ConversationId.createFromString(command.conversationId),
    );

    if (conversation?.getTenantId() !== command.tenantId) {
      throw new NotFoundException('Conversation not found');
    }

    conversation.archive();
    await this.conversationRepository.save(conversation);
  }
}
