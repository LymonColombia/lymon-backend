import { UnauthorizedException } from '@nestjs/common';
import {
  VerifyGuestEmailHandler,
  VerifyGuestEmailResult,
} from '@/application/guest-auth/commands/verify-guest-email/verify-guest-email.handler';
import { VerifyGuestEmailCommand } from '@/application/guest-auth/commands/verify-guest-email/verify-guest-email.command';
import { GuestAccountRepository } from '@/domain/guest-account/repositories/guest-account.repository';
import { GuestAccountStatusEnum } from '@/domain/guest-account/value-objects/guest-account-status.vo';
import { createGuestAccountRepositoryMock } from '@test/shared/mocks/repositories/guest-account-repository.mock';
import { makeGuestAccount } from '@test/shared/fixtures/guest-account.fixture';

describe('VerifyGuestEmailHandler', () => {
  let handler: VerifyGuestEmailHandler;
  let guestAccountRepository: jest.Mocked<GuestAccountRepository>;

  beforeEach(() => {
    guestAccountRepository = createGuestAccountRepositoryMock();
    handler = new VerifyGuestEmailHandler(guestAccountRepository);
  });

  describe('when the token is invalid or tampered', () => {
    it('throws UnauthorizedException("Invalid or expired verification token")', async () => {
      guestAccountRepository.findByEmailVerificationToken.mockResolvedValue(
        null,
      );

      await expect(
        handler.execute(new VerifyGuestEmailCommand('bad-token')),
      ).rejects.toThrow(
        new UnauthorizedException('Invalid or expired verification token'),
      );
    });
  });

  describe('when the token has expired', () => {
    it('throws UnauthorizedException("Verification token has expired")', async () => {
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h ago
      guestAccountRepository.findByEmailVerificationToken.mockResolvedValue(
        makeGuestAccount({
          status: GuestAccountStatusEnum.PENDING_VERIFICATION,
          emailVerified: false,
          emailVerificationToken: 'hashed-token',
          emailVerificationExpiry: expiredDate,
        }),
      );

      await expect(
        handler.execute(new VerifyGuestEmailCommand('some-token')),
      ).rejects.toThrow(
        new UnauthorizedException('Verification token has expired'),
      );
    });
  });

  describe('when the email is already verified', () => {
    it('returns VerifyGuestEmailResult("Email already verified")', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      guestAccountRepository.findByEmailVerificationToken.mockResolvedValue(
        makeGuestAccount({
          status: GuestAccountStatusEnum.ACTIVE,
          emailVerified: true,
          emailVerificationToken: 'hashed-token',
          emailVerificationExpiry: futureDate,
        }),
      );

      const result = await handler.execute(
        new VerifyGuestEmailCommand('some-token'),
      );

      expect(result).toBeInstanceOf(VerifyGuestEmailResult);
      expect(result.message).toBe('Email already verified');
      expect(guestAccountRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('when the token is valid, not expired, and email is not verified', () => {
    it('verifies the email, saves the account, and returns success', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      guestAccountRepository.findByEmailVerificationToken.mockResolvedValue(
        makeGuestAccount({
          status: GuestAccountStatusEnum.PENDING_VERIFICATION,
          emailVerified: false,
          emailVerificationToken: 'hashed-token',
          emailVerificationExpiry: futureDate,
        }),
      );

      const result = await handler.execute(
        new VerifyGuestEmailCommand('some-token'),
      );

      expect(result).toBeInstanceOf(VerifyGuestEmailResult);
      expect(result.message).toBe('Email verified successfully');
      expect(guestAccountRepository.save).toHaveBeenCalledTimes(1);
    });
  });
});
