import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import {
  LoginHandler,
  LoginResult,
} from '@/application/auth/commands/login.handler';
import { LoginCommand } from '@/application/auth/commands/login.command';
import { UserRepository } from '@/domain/user/repositories/user.repository';
import { TenantRepository } from '@/domain/tenant/repositories/tenant.repository';
import { IPasswordHasher } from '@/application/auth/services/password-hasher.service';
import { ITokenService } from '@/application/auth/services/jwt.service';
import { createUserRepositoryMock } from '@test/shared/mocks/repositories/user-repository.mock';
import { createTenantRepositoryMock } from '@test/shared/mocks/repositories/tenant-repository.mock';
import { createPasswordHasherMock } from '@test/shared/mocks/services/password-hasher.mock';
import { createTokenServiceMock } from '@test/shared/mocks/services/token-service.mock';
import { createRoleRepositoryMock } from '@test/shared/mocks/repositories/role-repository.mock';
import { createEventEmitterMock } from '@test/shared/mocks/services/event-emitter.mock';
import { RoleRepository } from '@/domain/role/repositories/role.repository';
import {
  makeUser,
  USER_FIXTURE_DEFAULTS,
} from '@test/shared/fixtures/user.fixture';
import { makeTenant } from '@test/shared/fixtures/tenant.fixture';
import { PlanTypeEnum } from '@/domain/tenant/value-objects/plan-type.vo';
import { Role, RoleId } from '@/domain/role/entities/role.entity';
import { Permission } from '@/domain/role/value-objects/permission.vo';
import type { RoleAssignment } from '@/domain/user/entities/user.entity';

describe('LoginHandler', () => {
  let handler: LoginHandler;
  let userRepository: jest.Mocked<UserRepository>;
  let tenantRepository: jest.Mocked<TenantRepository>;
  let passwordHasher: jest.Mocked<IPasswordHasher>;
  let tokenService: jest.Mocked<ITokenService>;
  let roleRepository: jest.Mocked<RoleRepository>;
  let eventEmitter: ReturnType<typeof createEventEmitterMock>;

  beforeEach(() => {
    userRepository = createUserRepositoryMock();
    tenantRepository = createTenantRepositoryMock();
    passwordHasher = createPasswordHasherMock();
    tokenService = createTokenServiceMock();
    roleRepository = createRoleRepositoryMock();
    eventEmitter = createEventEmitterMock();

    handler = new LoginHandler(
      userRepository,
      tenantRepository,
      passwordHasher,
      tokenService,
      roleRepository,
      eventEmitter as any,
    );
  });

  describe('when credentials are valid', () => {
    it('returns a LoginResult with tokens', async () => {
      userRepository.findByEmail.mockResolvedValue(makeUser());
      passwordHasher.compare.mockResolvedValue(true);
      tenantRepository.findById.mockResolvedValue(makeTenant());

      const result = await handler.execute(
        new LoginCommand(USER_FIXTURE_DEFAULTS.email, 'plain-password'),
      );

      expect(result).toBeInstanceOf(LoginResult);
      expect(result.userId).toBe(USER_FIXTURE_DEFAULTS.id);
      expect(result.email).toBe(USER_FIXTURE_DEFAULTS.email);
      expect(result.tenantId).toBe(USER_FIXTURE_DEFAULTS.tenantId);
      expect(result.isOwner).toBe(true);
      expect(result.emailVerified).toBe(true);
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.tutorialCompleted).toBe(false);
      expect(result.trialWarning).toBeNull();
    });
  });

  describe('when the trial has expired', () => {
    it('throws ForbiddenException', async () => {
      userRepository.findByEmail.mockResolvedValue(makeUser());
      passwordHasher.compare.mockResolvedValue(true);
      tenantRepository.findById.mockResolvedValue(
        makeTenant({ trialEndsAt: new Date(Date.now() - 1000) }),
      );

      await expect(
        handler.execute(
          new LoginCommand(USER_FIXTURE_DEFAULTS.email, 'plain-password'),
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('when the trial ends within 2 days', () => {
    it('returns a trialWarning in the result', async () => {
      userRepository.findByEmail.mockResolvedValue(makeUser());
      passwordHasher.compare.mockResolvedValue(true);
      tenantRepository.findById.mockResolvedValue(
        makeTenant({
          trialEndsAt: new Date(Date.now() + 1.5 * 24 * 60 * 60 * 1000),
        }),
      );

      const result = await handler.execute(
        new LoginCommand(USER_FIXTURE_DEFAULTS.email, 'plain-password'),
      );

      expect(result.trialWarning).not.toBeNull();
      expect(result.trialWarning?.daysRemaining).toBeLessThanOrEqual(2);
    });
  });

  describe('when the tenant is not on a trial plan', () => {
    it('never blocks and never warns', async () => {
      userRepository.findByEmail.mockResolvedValue(makeUser());
      passwordHasher.compare.mockResolvedValue(true);
      tenantRepository.findById.mockResolvedValue(
        makeTenant({ plan: PlanTypeEnum.LYMON_ONE, trialEndsAt: null }),
      );

      const result = await handler.execute(
        new LoginCommand(USER_FIXTURE_DEFAULTS.email, 'plain-password'),
      );

      expect(result.trialWarning).toBeNull();
    });
  });

  describe('when the user does not exist', () => {
    it('throws UnauthorizedException', async () => {
      userRepository.findByEmail.mockResolvedValue(null);

      await expect(
        handler.execute(
          new LoginCommand(USER_FIXTURE_DEFAULTS.email, 'any-password'),
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('when the password is wrong', () => {
    it('throws UnauthorizedException', async () => {
      userRepository.findByEmail.mockResolvedValue(makeUser());
      passwordHasher.compare.mockResolvedValue(false);

      await expect(
        handler.execute(
          new LoginCommand(USER_FIXTURE_DEFAULTS.email, 'wrong-password'),
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('when the tenant does not exist', () => {
    it('throws UnauthorizedException', async () => {
      userRepository.findByEmail.mockResolvedValue(makeUser());
      passwordHasher.compare.mockResolvedValue(true);
      tenantRepository.findById.mockResolvedValue(null);

      await expect(
        handler.execute(
          new LoginCommand(USER_FIXTURE_DEFAULTS.email, 'plain-password'),
        ),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('when login is successful with no role assignments', () => {
    it('returns LoginResult with empty roleAssignments in token', async () => {
      userRepository.findByEmail.mockResolvedValue(
        makeUser({ roleAssignments: [] }),
      );
      passwordHasher.compare.mockResolvedValue(true);
      tenantRepository.findById.mockResolvedValue(makeTenant());

      const result = await handler.execute(
        new LoginCommand(USER_FIXTURE_DEFAULTS.email, 'plain-password'),
      );

      expect(result).toBeInstanceOf(LoginResult);
      // Token was generated — verify the payload had empty roleAssignments
      expect(tokenService.generateAccesToken).toHaveBeenCalledWith(
        expect.objectContaining({ roleAssignments: [] }),
      );
    });
  });

  describe('when login is successful with one valid role', () => {
    it('returns LoginResult with resolved role in token payload', async () => {
      const assignment: RoleAssignment = {
        roleId: 'role-admin',
        scope: { type: 'TENANT' },
      };
      userRepository.findByEmail.mockResolvedValue(
        makeUser({ isOwner: false, roleAssignments: [assignment] }),
      );
      passwordHasher.compare.mockResolvedValue(true);
      tenantRepository.findById.mockResolvedValue(makeTenant());
      roleRepository.findById.mockResolvedValue(
        Role.reconstitute(
          RoleId.createFromString('role-admin'),
          'ADMIN',
          [Permission.PROPERTY_VIEW, Permission.PROPERTY_CREATE],
          new Date(),
          new Date(),
        ),
      );

      const result = await handler.execute(
        new LoginCommand(USER_FIXTURE_DEFAULTS.email, 'plain-password'),
      );

      expect(result).toBeInstanceOf(LoginResult);
      expect(tokenService.generateAccesToken).toHaveBeenCalledWith(
        expect.objectContaining({
          roleAssignments: [
            expect.objectContaining({
              roleId: 'role-admin',
              roleName: 'ADMIN',
              permissions: [
                Permission.PROPERTY_VIEW,
                Permission.PROPERTY_CREATE,
              ],
            }),
          ],
        }),
      );
    });
  });

  describe('when login is successful with multiple roles', () => {
    it('returns LoginResult with all resolved roles', async () => {
      const assignments: RoleAssignment[] = [
        { roleId: 'role-admin', scope: { type: 'TENANT' } },
        {
          roleId: 'role-staff',
          scope: {
            type: 'PROPERTY',
            resourceIds: ['65f1a1a2-b3c4-d5e6-f7a8-b9c100000000'],
          },
        },
        { roleId: 'role-deleted', scope: { type: 'TENANT' } },
      ];
      userRepository.findByEmail.mockResolvedValue(
        makeUser({ isOwner: false, roleAssignments: assignments }),
      );
      passwordHasher.compare.mockResolvedValue(true);
      tenantRepository.findById.mockResolvedValue(makeTenant());

      roleRepository.findById
        .mockResolvedValueOnce(
          Role.reconstitute(
            RoleId.createFromString('role-admin'),
            'ADMIN',
            [Permission.PROPERTY_VIEW],
            new Date(),
            new Date(),
          ),
        )
        .mockResolvedValueOnce(
          Role.reconstitute(
            RoleId.createFromString('role-staff'),
            'STAFF',
            [Permission.RESERVATION_VIEW],
            new Date(),
            new Date(),
          ),
        )
        .mockResolvedValueOnce(null); // role-deleted not found

      const result = await handler.execute(
        new LoginCommand(USER_FIXTURE_DEFAULTS.email, 'plain-password'),
      );

      expect(result).toBeInstanceOf(LoginResult);
      // Only 2 valid roles resolved (role-deleted was null)
      expect(tokenService.generateAccesToken).toHaveBeenCalledWith(
        expect.objectContaining({
          roleAssignments: expect.arrayContaining([
            expect.objectContaining({ roleId: 'role-admin' }),
            expect.objectContaining({ roleId: 'role-staff' }),
          ]),
        }),
      );
      // Verify the deleted role is NOT in the payload
      const payload = tokenService.generateAccesToken.mock.calls[0][0];
      expect(payload.roleAssignments).toHaveLength(2);
    });
  });
});
