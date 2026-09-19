import { UnauthorizedException } from '@nestjs/common';
import { VerifyEmailHandler } from '@/application/user/commands/verify-email/verify-email.handler';
import { VerifyEmailCommand } from '@/application/user/commands/verify-email/verify-email.command';
import { UserRepository } from '@/domain/user/repositories/user.repository';
import { TenantRepository } from '@/domain/tenant/repositories/tenant.repository';
import { ITokenService } from '@/application/auth/services/jwt.service';
import { createUserRepositoryMock } from '@test/shared/mocks/repositories/user-repository.mock';
import { createTenantRepositoryMock } from '@test/shared/mocks/repositories/tenant-repository.mock';
import { createTokenServiceMock } from '@test/shared/mocks/services/token-service.mock';
import { createEventEmitterMock } from '@test/shared/mocks/services/event-emitter.mock';
import {
  makeUser,
  USER_FIXTURE_DEFAULTS,
} from '@test/shared/fixtures/user.fixture';
import { makeTenant } from '@test/shared/fixtures/tenant.fixture';
import { JwtPayload } from '@/application/auth/services/jwt.service';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const VALID_PAYLOAD: JwtPayload = {
  userId: USER_FIXTURE_DEFAULTS.id,
  email: USER_FIXTURE_DEFAULTS.email,
  tenantId: USER_FIXTURE_DEFAULTS.tenantId,
  activePlan: 'TRIAL',
  isOwner: true,
  emailVerified: false,
  roleAssignments: [],
  trialEndsAt: null,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('VerifyEmailHandler', () => {
  let handler: VerifyEmailHandler;
  let userRepository: jest.Mocked<UserRepository>;
  let tenantRepository: jest.Mocked<TenantRepository>;
  let tokenService: jest.Mocked<ITokenService>;
  let eventEmitter: ReturnType<typeof createEventEmitterMock>;

  beforeEach(() => {
    userRepository = createUserRepositoryMock();
    tenantRepository = createTenantRepositoryMock();
    tokenService = createTokenServiceMock();
    eventEmitter = createEventEmitterMock();

    handler = new VerifyEmailHandler(
      userRepository,
      tenantRepository,
      tokenService,
      eventEmitter as any,
    );
  });

  describe('when the token is invalid or expired', () => {
    it('throws UnauthorizedException', async () => {
      tokenService.verifyToken.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(
        handler.execute(new VerifyEmailCommand('bad-token')),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('when the token is valid but the user does not exist', () => {
    it('throws UnauthorizedException', async () => {
      tokenService.verifyToken.mockReturnValue(VALID_PAYLOAD);
      userRepository.findById.mockResolvedValue(null);

      await expect(
        handler.execute(new VerifyEmailCommand('valid-token')),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('when the user email is already verified', () => {
    it('resolves without saving', async () => {
      tokenService.verifyToken.mockReturnValue(VALID_PAYLOAD);
      userRepository.findById.mockResolvedValue(
        makeUser({ emailVerified: true }),
      );

      await expect(
        handler.execute(new VerifyEmailCommand('valid-token')),
      ).resolves.toBeUndefined();

      expect(userRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('when the user email is not verified', () => {
    beforeEach(() => {
      tokenService.verifyToken.mockReturnValue(VALID_PAYLOAD);
      userRepository.findById.mockResolvedValue(
        makeUser({ emailVerified: false }),
      );
    });

    it('saves the updated user', async () => {
      tenantRepository.findById.mockResolvedValue(null);

      await handler.execute(new VerifyEmailCommand('valid-token'));

      expect(userRepository.save).toHaveBeenCalledTimes(1);
    });

    describe('and the tenant is also unverified', () => {
      it('verifies and saves the tenant too', async () => {
        tenantRepository.findById.mockResolvedValue(
          makeTenant({ emailVerified: false }),
        );

        await handler.execute(new VerifyEmailCommand('valid-token'));

        expect(tenantRepository.save).toHaveBeenCalledTimes(1);
      });
    });

    describe('and the tenant is already verified', () => {
      it('does not save the tenant again', async () => {
        tenantRepository.findById.mockResolvedValue(
          makeTenant({ emailVerified: true }),
        );

        await handler.execute(new VerifyEmailCommand('valid-token'));

        expect(tenantRepository.save).not.toHaveBeenCalled();
      });
    });

    describe('and the tenant does not exist', () => {
      it('still resolves successfully', async () => {
        tenantRepository.findById.mockResolvedValue(null);

        await expect(
          handler.execute(new VerifyEmailCommand('valid-token')),
        ).resolves.toBeUndefined();

        expect(tenantRepository.save).not.toHaveBeenCalled();
      });
    });
  });
});
