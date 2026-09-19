jest.mock('uuid', () => ({ v4: () => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }));

import { NotFoundException } from '@nestjs/common';
import { GetConversationThreadHandler } from '@/application/conversation/queries/get-conversation-thread/get-conversation-thread.handler';
import { GetConversationThreadQuery } from '@/application/conversation/queries/get-conversation-thread/get-conversation-thread.query';
import { ConversationThreadResult } from '@/application/conversation/queries/get-conversation-thread/get-conversation-thread.result';
import { ConversationRepository } from '@/domain/conversation/repositories/conversation.repository';
import { GuestMessageRepository } from '@/domain/guest-message/repositories/guest-message.repository';
import { IMessageBodyProvider } from '@/application/shared/services/message-body-provider.service';
import { GuestMessageDirection } from '@/domain/guest-message/value-objects/guest-message-direction.vo';
import { GuestMessageChannel } from '@/domain/guest-message/value-objects/guest-message-channel.vo';
import { createConversationRepositoryMock } from '@test/shared/mocks/repositories/conversation-repository.mock';
import { createGuestMessageRepositoryMock } from '@test/shared/mocks/repositories/guest-message-repository.mock';
import { makeConversation, CONVERSATION_FIXTURE_DEFAULTS } from '@test/shared/fixtures/conversation.fixture';
import { makeGuestMessage } from '@test/shared/fixtures/guest-message.fixture';

const TENANT_ID = CONVERSATION_FIXTURE_DEFAULTS.tenantId;
const CONVERSATION_ID = CONVERSATION_FIXTURE_DEFAULTS.id;

describe('GetConversationThreadHandler', () => {
  let handler: GetConversationThreadHandler;
  let conversationRepository: jest.Mocked<ConversationRepository>;
  let guestMessageRepository: jest.Mocked<GuestMessageRepository>;
  let messageBodyProvider: jest.Mocked<IMessageBodyProvider>;

  beforeEach(() => {
    conversationRepository = createConversationRepositoryMock();
    guestMessageRepository = createGuestMessageRepositoryMock();
    messageBodyProvider = { getBody: jest.fn() };

    handler = new GetConversationThreadHandler(
      conversationRepository,
      guestMessageRepository,
      messageBodyProvider,
    );

    jest.clearAllMocks();
  });

  describe('Happy path', () => {
    it('returns a ConversationThreadResult with conversation summary and message DTOs', async () => {
      // Arrange
      const conversation = makeConversation({ tenantId: TENANT_ID });
      const message = makeGuestMessage({
        direction: GuestMessageDirection.OUTBOUND,
        channel: GuestMessageChannel.EMAIL,
        providerMessageId: null,
        preview: 'Hello guest',
      });
      conversationRepository.findById.mockResolvedValue(conversation);
      guestMessageRepository.findByConversationId.mockResolvedValue([message]);
      messageBodyProvider.getBody.mockResolvedValue(null);
      const query = new GetConversationThreadQuery(TENANT_ID, CONVERSATION_ID);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toBeInstanceOf(ConversationThreadResult);
      expect(result.conversation.id).toBe(CONVERSATION_FIXTURE_DEFAULTS.id);
      expect(result.messages).toHaveLength(1);

      const msgDto = result.messages[0];
      expect(msgDto.id).toBe(message.getId().toString());
      expect(msgDto.direction).toBe(GuestMessageDirection.OUTBOUND);
      expect(msgDto.channel).toBe(GuestMessageChannel.EMAIL);
      expect(msgDto.preview).toBe('Hello guest');
    });

    it('resolves body from the provider when the message has a providerMessageId', async () => {
      // Arrange
      const conversation = makeConversation({ tenantId: TENANT_ID });
      const message = makeGuestMessage({ providerMessageId: 'provider-msg-001' });
      conversationRepository.findById.mockResolvedValue(conversation);
      guestMessageRepository.findByConversationId.mockResolvedValue([message]);
      messageBodyProvider.getBody.mockResolvedValue('<p>Full email body</p>');
      const query = new GetConversationThreadQuery(TENANT_ID, CONVERSATION_ID);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(messageBodyProvider.getBody).toHaveBeenCalledWith('provider-msg-001');
      expect(result.messages[0].body).toBe('<p>Full email body</p>');
      expect(result.messages[0].bodyResolved).toBe(true);
    });

    it('falls back to preview as body when the provider returns null', async () => {
      // Arrange
      const conversation = makeConversation({ tenantId: TENANT_ID });
      const message = makeGuestMessage({ providerMessageId: 'provider-msg-002', preview: 'Preview text' });
      conversationRepository.findById.mockResolvedValue(conversation);
      guestMessageRepository.findByConversationId.mockResolvedValue([message]);
      messageBodyProvider.getBody.mockResolvedValue(null);
      const query = new GetConversationThreadQuery(TENANT_ID, CONVERSATION_ID);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.messages[0].body).toBe('Preview text');
      expect(result.messages[0].bodyResolved).toBe(false);
    });

    it('falls back to preview as body when the provider throws', async () => {
      // Arrange
      const conversation = makeConversation({ tenantId: TENANT_ID });
      const message = makeGuestMessage({ providerMessageId: 'provider-msg-003', preview: 'Fallback preview' });
      conversationRepository.findById.mockResolvedValue(conversation);
      guestMessageRepository.findByConversationId.mockResolvedValue([message]);
      messageBodyProvider.getBody.mockRejectedValue(new Error('Provider unavailable'));
      const query = new GetConversationThreadQuery(TENANT_ID, CONVERSATION_ID);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.messages[0].body).toBe('Fallback preview');
      expect(result.messages[0].bodyResolved).toBe(false);
    });

    it('skips provider call and uses preview when message has no providerMessageId', async () => {
      // Arrange
      const conversation = makeConversation({ tenantId: TENANT_ID });
      const message = makeGuestMessage({ providerMessageId: null, preview: 'No provider' });
      conversationRepository.findById.mockResolvedValue(conversation);
      guestMessageRepository.findByConversationId.mockResolvedValue([message]);
      const query = new GetConversationThreadQuery(TENANT_ID, CONVERSATION_ID);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(messageBodyProvider.getBody).not.toHaveBeenCalled();
      expect(result.messages[0].body).toBe('No provider');
      expect(result.messages[0].bodyResolved).toBe(false);
    });

    it('returns an empty messages array when the conversation has no messages', async () => {
      // Arrange
      const conversation = makeConversation({ tenantId: TENANT_ID });
      conversationRepository.findById.mockResolvedValue(conversation);
      guestMessageRepository.findByConversationId.mockResolvedValue([]);
      const query = new GetConversationThreadQuery(TENANT_ID, CONVERSATION_ID);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.messages).toHaveLength(0);
      expect(result.conversation.id).toBe(CONVERSATION_FIXTURE_DEFAULTS.id);
    });
  });

  describe('Error cases', () => {
    it('throws NotFoundException when the conversation does not exist', async () => {
      // Arrange
      conversationRepository.findById.mockResolvedValue(null);
      const query = new GetConversationThreadQuery(TENANT_ID, CONVERSATION_ID);

      // Act / Assert
      await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(query)).rejects.toThrow('Conversation not found');
      expect(guestMessageRepository.findByConversationId).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the conversation belongs to a different tenant', async () => {
      // Arrange
      const conversation = makeConversation({ tenantId: 'wrong-tenant' });
      conversationRepository.findById.mockResolvedValue(conversation);
      const query = new GetConversationThreadQuery(TENANT_ID, CONVERSATION_ID);

      // Act / Assert
      await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(query)).rejects.toThrow('Conversation not found');
      expect(guestMessageRepository.findByConversationId).not.toHaveBeenCalled();
    });
  });
});
