jest.mock('uuid', () => ({ v4: () => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }));

import { GetConversationsByGuestIdHandler } from '@/application/conversation/queries/get-conversations-by-guest-id/get-conversations-by-guest-id.handler';
import { GetConversationsByGuestIdQuery } from '@/application/conversation/queries/get-conversations-by-guest-id/get-conversations-by-guest-id.query';
import { GetConversationsByGuestIdResult } from '@/application/conversation/queries/get-conversations-by-guest-id/get-conversations-by-guest-id.result';
import { ConversationRepository } from '@/domain/conversation/repositories/conversation.repository';
import { ConversationStatus } from '@/domain/conversation/value-objects/conversation-status.vo';
import { createConversationRepositoryMock } from '@test/shared/mocks/repositories/conversation-repository.mock';
import { makeConversation, CONVERSATION_FIXTURE_DEFAULTS } from '@test/shared/fixtures/conversation.fixture';

const TENANT_ID = CONVERSATION_FIXTURE_DEFAULTS.tenantId;
const GUEST_ID = CONVERSATION_FIXTURE_DEFAULTS.guestId;

describe('GetConversationsByGuestIdHandler', () => {
  let handler: GetConversationsByGuestIdHandler;
  let conversationRepository: jest.Mocked<ConversationRepository>;

  beforeEach(() => {
    conversationRepository = createConversationRepositoryMock();
    handler = new GetConversationsByGuestIdHandler(conversationRepository);
    jest.clearAllMocks();
  });

  describe('Happy path', () => {
    it('returns a result with conversation summaries for the given guest', async () => {
      // Arrange
      const conversation = makeConversation({ tenantId: TENANT_ID, guestId: GUEST_ID });
      conversationRepository.findByGuestId.mockResolvedValue([conversation]);
      const query = new GetConversationsByGuestIdQuery(TENANT_ID, GUEST_ID);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toBeInstanceOf(GetConversationsByGuestIdResult);
      expect(result.items).toHaveLength(1);

      const dto = result.items[0];
      expect(dto.id).toBe(CONVERSATION_FIXTURE_DEFAULTS.id);
      expect(dto.guestId).toBe(GUEST_ID);
      expect(dto.subject).toBe(CONVERSATION_FIXTURE_DEFAULTS.subject);
      expect(dto.status).toBe(ConversationStatus.OPEN);
    });

    it('calls findByGuestId with the correct tenantId and guestId', async () => {
      // Arrange
      conversationRepository.findByGuestId.mockResolvedValue([]);
      const query = new GetConversationsByGuestIdQuery(TENANT_ID, GUEST_ID);

      // Act
      await handler.execute(query);

      // Assert
      expect(conversationRepository.findByGuestId).toHaveBeenCalledWith(TENANT_ID, GUEST_ID);
    });

    it('returns multiple conversation summaries when the guest has several conversations', async () => {
      // Arrange
      const conv1 = makeConversation({ subject: 'First thread' });
      const conv2 = makeConversation({ subject: 'Second thread', status: ConversationStatus.ARCHIVED });
      conversationRepository.findByGuestId.mockResolvedValue([conv1, conv2]);
      const query = new GetConversationsByGuestIdQuery(TENANT_ID, GUEST_ID);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.items).toHaveLength(2);
    });

    it('returns an empty items array when the guest has no conversations', async () => {
      // Arrange
      conversationRepository.findByGuestId.mockResolvedValue([]);
      const query = new GetConversationsByGuestIdQuery(TENANT_ID, GUEST_ID);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.items).toHaveLength(0);
    });

    it('maps reservationId correctly when it is non-null', async () => {
      // Arrange
      const conversation = makeConversation({
        tenantId: TENANT_ID,
        guestId: GUEST_ID,
        reservationId: 'res-abc-123',
      });
      conversationRepository.findByGuestId.mockResolvedValue([conversation]);
      const query = new GetConversationsByGuestIdQuery(TENANT_ID, GUEST_ID);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.items[0].reservationId).toBe('res-abc-123');
    });
  });

  describe('Error cases', () => {
    it('propagates repository errors to the caller', async () => {
      // Arrange
      conversationRepository.findByGuestId.mockRejectedValue(new Error('DB timeout'));
      const query = new GetConversationsByGuestIdQuery(TENANT_ID, GUEST_ID);

      // Act / Assert
      await expect(handler.execute(query)).rejects.toThrow('DB timeout');
    });
  });
});
