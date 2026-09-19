jest.mock('uuid', () => ({ v4: () => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }));

import { GetConversationsByTenantHandler } from '@/application/conversation/queries/get-conversations-by-tenant/get-conversations-by-tenant.handler';
import { GetConversationsByTenantQuery } from '@/application/conversation/queries/get-conversations-by-tenant/get-conversations-by-tenant.query';
import { GetConversationsByTenantResult } from '@/application/conversation/queries/get-conversations-by-tenant/get-conversations-by-tenant.result';
import { ConversationRepository } from '@/domain/conversation/repositories/conversation.repository';
import { ConversationStatus } from '@/domain/conversation/value-objects/conversation-status.vo';
import { GuestMessageChannel } from '@/domain/guest-message/value-objects/guest-message-channel.vo';
import { createConversationRepositoryMock } from '@test/shared/mocks/repositories/conversation-repository.mock';
import { makeConversation, CONVERSATION_FIXTURE_DEFAULTS } from '@test/shared/fixtures/conversation.fixture';

const TENANT_ID = CONVERSATION_FIXTURE_DEFAULTS.tenantId;

describe('GetConversationsByTenantHandler', () => {
  let handler: GetConversationsByTenantHandler;
  let conversationRepository: jest.Mocked<ConversationRepository>;

  beforeEach(() => {
    conversationRepository = createConversationRepositoryMock();
    handler = new GetConversationsByTenantHandler(conversationRepository);
    jest.clearAllMocks();
  });

  describe('Happy path', () => {
    it('returns paginated conversations mapped to summary DTOs', async () => {
      // Arrange
      const conversation = makeConversation({ tenantId: TENANT_ID });
      conversationRepository.findByTenantPaginated.mockResolvedValue({
        conversations: [conversation],
        total: 1,
      });
      const query = new GetConversationsByTenantQuery(TENANT_ID, 1, 20);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result).toBeInstanceOf(GetConversationsByTenantResult);
      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);

      const dto = result.items[0];
      expect(dto.id).toBe(CONVERSATION_FIXTURE_DEFAULTS.id);
      expect(dto.guestId).toBe(CONVERSATION_FIXTURE_DEFAULTS.guestId);
      expect(dto.subject).toBe(CONVERSATION_FIXTURE_DEFAULTS.subject);
      expect(dto.status).toBe(ConversationStatus.OPEN);
    });

    it('passes channel filter through to the repository when a valid channel is supplied', async () => {
      // Arrange
      conversationRepository.findByTenantPaginated.mockResolvedValue({
        conversations: [],
        total: 0,
      });
      const query = new GetConversationsByTenantQuery(TENANT_ID, 1, 10, GuestMessageChannel.EMAIL);

      // Act
      await handler.execute(query);

      // Assert
      expect(conversationRepository.findByTenantPaginated).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({ channel: GuestMessageChannel.EMAIL }),
        1,
        10,
      );
    });

    it('passes status filter through to the repository when a valid status is supplied', async () => {
      // Arrange
      conversationRepository.findByTenantPaginated.mockResolvedValue({
        conversations: [],
        total: 0,
      });
      const query = new GetConversationsByTenantQuery(
        TENANT_ID,
        1,
        10,
        undefined,
        ConversationStatus.ARCHIVED,
      );

      // Act
      await handler.execute(query);

      // Assert
      expect(conversationRepository.findByTenantPaginated).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({ status: ConversationStatus.ARCHIVED }),
        1,
        10,
      );
    });

    it('passes unreadOnly filter through to the repository when unreadOnly is true', async () => {
      // Arrange
      conversationRepository.findByTenantPaginated.mockResolvedValue({
        conversations: [],
        total: 0,
      });
      const query = new GetConversationsByTenantQuery(
        TENANT_ID,
        1,
        10,
        undefined,
        undefined,
        true,
      );

      // Act
      await handler.execute(query);

      // Assert
      expect(conversationRepository.findByTenantPaginated).toHaveBeenCalledWith(
        TENANT_ID,
        expect.objectContaining({ unreadOnly: true }),
        1,
        10,
      );
    });

    it('ignores an invalid channel value and does not include it in filters', async () => {
      // Arrange
      conversationRepository.findByTenantPaginated.mockResolvedValue({
        conversations: [],
        total: 0,
      });
      const query = new GetConversationsByTenantQuery(TENANT_ID, 1, 10, 'invalid-channel');

      // Act
      await handler.execute(query);

      // Assert
      const calledFilters = conversationRepository.findByTenantPaginated.mock.calls[0][1];
      expect(calledFilters.channel).toBeUndefined();
    });

    it('returns an empty items array and correct totalPages when no conversations match', async () => {
      // Arrange
      conversationRepository.findByTenantPaginated.mockResolvedValue({
        conversations: [],
        total: 0,
      });
      const query = new GetConversationsByTenantQuery(TENANT_ID, 1, 10);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('computes totalPages correctly using the getter', async () => {
      // Arrange
      conversationRepository.findByTenantPaginated.mockResolvedValue({
        conversations: [makeConversation(), makeConversation()],
        total: 25,
      });
      const query = new GetConversationsByTenantQuery(TENANT_ID, 1, 10);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.totalPages).toBe(3);
    });
  });

  describe('Error cases', () => {
    it('propagates repository errors to the caller', async () => {
      // Arrange
      conversationRepository.findByTenantPaginated.mockRejectedValue(
        new Error('DB connection failed'),
      );
      const query = new GetConversationsByTenantQuery(TENANT_ID, 1, 10);

      // Act / Assert
      await expect(handler.execute(query)).rejects.toThrow('DB connection failed');
    });
  });
});
