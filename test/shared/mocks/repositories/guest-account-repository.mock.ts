import { GuestAccountRepository } from '@/domain/guest-account/repositories/guest-account.repository';

export function createGuestAccountRepositoryMock(): jest.Mocked<GuestAccountRepository> {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByEmailVerificationToken: jest.fn(),
    findByPasswordResetToken: jest.fn(),
    findByEmailChangeToken: jest.fn(),
  };
}
