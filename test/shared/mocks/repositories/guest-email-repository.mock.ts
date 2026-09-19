import { GuestEmailRepository } from '@/domain/guest-email/repositories/guest-email.repository';

export const createGuestEmailRepositoryMock =
  (): jest.Mocked<GuestEmailRepository> => ({
    save: jest.fn(),
    findById: jest.fn(),
    findByGuestId: jest.fn(),
    findByGuestIdPaginated: jest.fn(),
  });
