import { ConversationRepository } from '@/domain/conversation/repositories/conversation.repository';

export function createConversationRepositoryMock(): jest.Mocked<ConversationRepository> {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findByTenantAndGuest: jest.fn(),
    findByTenantPaginated: jest.fn(),
    findByGuestId: jest.fn(),
  };
}
