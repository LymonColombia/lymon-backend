jest.mock('uuid', () => ({ v4: () => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }));

import { NotFoundException } from '@nestjs/common';
import { ArchiveConversationHandler } from '@/application/conversation/commands/archive-conversation/archive-conversation.handler';
import { ArchiveConversationCommand } from '@/application/conversation/commands/archive-conversation/archive-conversation.command';
import { ConversationRepository } from '@/domain/conversation/repositories/conversation.repository';
import { ConversationStatus } from '@/domain/conversation/value-objects/conversation-status.vo';
import { createConversationRepositoryMock } from '@test/shared/mocks/repositories/conversation-repository.mock';
import { makeConversation, CONVERSATION_FIXTURE_DEFAULTS } from '@test/shared/fixtures/conversation.fixture';

const TENANT_ID = CONVERSATION_FIXTURE_DEFAULTS.tenantId;
const CONVERSATION_ID = CONVERSATION_FIXTURE_DEFAULTS.id;

describe('ArchiveConversationHandler', () => {
  let handler: ArchiveConversationHandler;
  let conversationRepository: jest.Mocked<ConversationRepository>;

  beforeEach(() => {
    conversationRepository = createConversationRepositoryMock();

    handler = new ArchiveConversationHandler(conversationRepository);

    jest.clearAllMocks();
  });

  describe('Happy path', () => {
    it('sets status to ARCHIVED and saves the conversation', async () => {
      // Arrange
      const conversation = makeConversation({
        tenantId: TENANT_ID,
        status: ConversationStatus.OPEN,
      });
      conversationRepository.findById.mockResolvedValue(conversation);
      conversationRepository.save.mockResolvedValue(undefined);
      const command = new ArchiveConversationCommand(TENANT_ID, CONVERSATION_ID);

      // Act
      await handler.execute(command);

      // Assert
      expect(conversationRepository.findById).toHaveBeenCalledTimes(1);
      expect(conversation.getStatus()).toBe(ConversationStatus.ARCHIVED);
      expect(conversationRepository.save).toHaveBeenCalledWith(conversation);
    });

    it('calls findById with a ConversationId derived from the command string', async () => {
      // Arrange
      const conversation = makeConversation({ tenantId: TENANT_ID });
      conversationRepository.findById.mockResolvedValue(conversation);
      conversationRepository.save.mockResolvedValue(undefined);
      const command = new ArchiveConversationCommand(TENANT_ID, CONVERSATION_ID);

      // Act
      await handler.execute(command);

      // Assert
      const calledWith = conversationRepository.findById.mock.calls[0][0];
      expect(calledWith.toString()).toBe(CONVERSATION_ID);
    });

    it('can archive a conversation that was previously snoozed', async () => {
      // Arrange
      const conversation = makeConversation({
        tenantId: TENANT_ID,
        status: ConversationStatus.SNOOZED,
      });
      conversationRepository.findById.mockResolvedValue(conversation);
      conversationRepository.save.mockResolvedValue(undefined);
      const command = new ArchiveConversationCommand(TENANT_ID, CONVERSATION_ID);

      // Act
      await handler.execute(command);

      // Assert
      expect(conversation.getStatus()).toBe(ConversationStatus.ARCHIVED);
      expect(conversationRepository.save).toHaveBeenCalledWith(conversation);
    });
  });

  describe('Error cases', () => {
    it('throws NotFoundException when the conversation does not exist', async () => {
      // Arrange
      conversationRepository.findById.mockResolvedValue(null);
      const command = new ArchiveConversationCommand(TENANT_ID, CONVERSATION_ID);

      // Act / Assert
      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(command)).rejects.toThrow('Conversation not found');
      expect(conversationRepository.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the conversation belongs to a different tenant', async () => {
      // Arrange
      const conversation = makeConversation({ tenantId: 'other-tenant-id' });
      conversationRepository.findById.mockResolvedValue(conversation);
      const command = new ArchiveConversationCommand(TENANT_ID, CONVERSATION_ID);

      // Act / Assert
      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(command)).rejects.toThrow('Conversation not found');
      expect(conversationRepository.save).not.toHaveBeenCalled();
    });
  });
});
