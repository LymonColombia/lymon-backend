import { ConflictException } from '@nestjs/common';
import {
  RegisterTenantHandler,
  RegisterTenantResult,
} from '@/application/tenant/commands/register-tenant.handler';
import { RegisterTenantCommand } from '@/application/tenant/commands/register-tenant.command';
import { TenantRepository } from '@/domain/tenant/repositories/tenant.repository';
import { UserRepository } from '@/domain/user/repositories/user.repository';
import { IPasswordHasher } from '@/application/auth/services/password-hasher.service';
import { ITokenService } from '@/application/auth/services/jwt.service';
import { IEmailService } from '@/application/shared/services/email.service';
import { PlanTypeEnum } from '@/domain/tenant/value-objects/plan-type.vo';
import { createTenantRepositoryMock } from '@test/shared/mocks/repositories/tenant-repository.mock';
import { createUserRepositoryMock } from '@test/shared/mocks/repositories/user-repository.mock';
import { createPasswordHasherMock } from '@test/shared/mocks/services/password-hasher.mock';
import { createTokenServiceMock } from '@test/shared/mocks/services/token-service.mock';
import { createEmailServiceMock } from '@test/shared/mocks/services/email-service.mock';
import { createEventEmitterMock } from '@test/shared/mocks/services/event-emitter.mock';
import {
  makeTenant,
  TENANT_FIXTURE_DEFAULTS,
} from '@test/shared/fixtures/tenant.fixture';
import {
  makeUser,
  USER_FIXTURE_DEFAULTS,
} from '@test/shared/fixtures/user.fixture';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeCommand(
  overrides?: Partial<RegisterTenantCommand>,
): RegisterTenantCommand {
  return new RegisterTenantCommand(
    overrides?.tenantName ?? TENANT_FIXTURE_DEFAULTS.name,
    overrides?.email ?? TENANT_FIXTURE_DEFAULTS.ownerEmail,
    overrides?.password ?? 'plain-password',
    overrides?.planType ?? PlanTypeEnum.TRIAL,
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('RegisterTenantHandler', () => {
  let handler: RegisterTenantHandler;
  let tenantRepository: jest.Mocked<TenantRepository>;
  let userRepository: jest.Mocked<UserRepository>;
  let passwordHasher: jest.Mocked<IPasswordHasher>;
  let tokenService: jest.Mocked<ITokenService>;
  let emailService: jest.Mocked<IEmailService>;
  let eventEmitter: ReturnType<typeof createEventEmitterMock>;

  beforeEach(() => {
    tenantRepository = createTenantRepositoryMock();
    userRepository = createUserRepositoryMock();
    passwordHasher = createPasswordHasherMock();
    tokenService = createTokenServiceMock();
    emailService = createEmailServiceMock();
    eventEmitter = createEventEmitterMock();

    handler = new RegisterTenantHandler(
      tenantRepository,
      userRepository,
      passwordHasher,
      tokenService,
      emailService,
      eventEmitter as any,
    );
  });

  describe('when email is already registered', () => {
    it('throws ConflictException', async () => {
      tenantRepository.exists.mockResolvedValue(true);

      await expect(handler.execute(makeCommand())).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('when tenant fails to persist', () => {
    it('throws an error', async () => {
      tenantRepository.exists.mockResolvedValue(false);
      tenantRepository.save.mockResolvedValue(undefined);
      tenantRepository.findByOwnerEmail.mockResolvedValue(null);

      await expect(handler.execute(makeCommand())).rejects.toThrow(
        'Failed to create a tenant',
      );
    });
  });

  describe('when user fails to persist', () => {
    it('throws an error', async () => {
      tenantRepository.exists.mockResolvedValue(false);
      tenantRepository.save.mockResolvedValue(undefined);
      tenantRepository.findByOwnerEmail.mockResolvedValue(makeTenant());
      passwordHasher.hash.mockResolvedValue(USER_FIXTURE_DEFAULTS.passwordHash);
      userRepository.save.mockResolvedValue(undefined);
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(handler.execute(makeCommand())).rejects.toThrow(
        'Failed to create user',
      );
    });
  });

  describe('when registration is successful', () => {
    beforeEach(() => {
      tenantRepository.exists.mockResolvedValue(false);
      tenantRepository.save.mockResolvedValue(undefined);
      tenantRepository.findByOwnerEmail.mockResolvedValue(makeTenant());
      passwordHasher.hash.mockResolvedValue(USER_FIXTURE_DEFAULTS.passwordHash);
      userRepository.save.mockResolvedValue(undefined);
      userRepository.findByEmail.mockResolvedValue(makeUser());
    });

    it('returns a RegisterTenantResult with tokens', async () => {
      const result = await handler.execute(makeCommand());

      expect(result).toBeInstanceOf(RegisterTenantResult);
      expect(result.tenantId).toBe(TENANT_FIXTURE_DEFAULTS.id);
      expect(result.userId).toBe(USER_FIXTURE_DEFAULTS.id);
      expect(result.email).toBe(TENANT_FIXTURE_DEFAULTS.ownerEmail);
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('sends a verification email', async () => {
      await handler.execute(makeCommand());

      expect(emailService.sendVerificationEmail).toHaveBeenCalledWith(
        TENANT_FIXTURE_DEFAULTS.ownerEmail,
        expect.any(String),
      );
    });

    it('still returns the result when the verification email fails', async () => {
      emailService.sendVerificationEmail.mockRejectedValue(
        new Error('Failed to send email: unauthorized'),
      );

      const result = await handler.execute(makeCommand());

      expect(result).toBeInstanceOf(RegisterTenantResult);
      expect(result.accessToken).toBe('access-token');
    });

    it('emits TENANT_REGISTERED audit event', async () => {
      await handler.execute(makeCommand());

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ entityType: 'TENANT' }),
      );
    });
  });

  describe('when registering with LYMON_ONE plan', () => {
    it('returns a RegisterTenantResult', async () => {
      tenantRepository.exists.mockResolvedValue(false);
      tenantRepository.save.mockResolvedValue(undefined);
      tenantRepository.findByOwnerEmail.mockResolvedValue(
        makeTenant({ plan: PlanTypeEnum.LYMON_ONE }),
      );
      passwordHasher.hash.mockResolvedValue(USER_FIXTURE_DEFAULTS.passwordHash);
      userRepository.save.mockResolvedValue(undefined);
      userRepository.findByEmail.mockResolvedValue(makeUser());

      const result = await handler.execute(
        makeCommand({ planType: PlanTypeEnum.LYMON_ONE }),
      );

      expect(result).toBeInstanceOf(RegisterTenantResult);
    });
  });

  describe('when registering with LYMON_PLUS plan', () => {
    it('returns a RegisterTenantResult', async () => {
      tenantRepository.exists.mockResolvedValue(false);
      tenantRepository.save.mockResolvedValue(undefined);
      tenantRepository.findByOwnerEmail.mockResolvedValue(
        makeTenant({ plan: PlanTypeEnum.LYMON_PLUS }),
      );
      passwordHasher.hash.mockResolvedValue(USER_FIXTURE_DEFAULTS.passwordHash);
      userRepository.save.mockResolvedValue(undefined);
      userRepository.findByEmail.mockResolvedValue(makeUser());

      const result = await handler.execute(
        makeCommand({ planType: PlanTypeEnum.LYMON_PLUS }),
      );

      expect(result).toBeInstanceOf(RegisterTenantResult);
    });
  });

  describe('initial entity state', () => {
    it('creates user with emailVerified = false', async () => {
      tenantRepository.exists.mockResolvedValue(false);
      tenantRepository.save.mockResolvedValue(undefined);
      tenantRepository.findByOwnerEmail.mockResolvedValue(makeTenant());
      passwordHasher.hash.mockResolvedValue(USER_FIXTURE_DEFAULTS.passwordHash);
      userRepository.save.mockResolvedValue(undefined);
      userRepository.findByEmail.mockResolvedValue(
        makeUser({ emailVerified: false }),
      );

      const result = await handler.execute(makeCommand());

      expect(result).toBeInstanceOf(RegisterTenantResult);
    });
  });
});
