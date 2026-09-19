import { GuestMessageRepository } from '@/domain/guest-message/repositories/guest-message.repository';

export function createGuestMessageRepositoryMock(): jest.Mocked<GuestMessageRepository> {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findByGuestId: jest.fn(),
    findByGuestIdPaginated: jest.fn(),
    findByProviderMessageId: jest.fn(),
    findByConversationId: jest.fn(),
  };
}
