import { type ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionGuard } from '@/infrastructure/auth/guards/permission.guard';
import { Permission } from '@/domain/role/value-objects/permission.vo';

describe('PermissionGuard', () => {
  const makeContext = (user?: unknown): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  it('allows access when no permission metadata is defined', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(undefined),
    } as unknown as Reflector;

    const guard = new PermissionGuard(reflector);

    expect(guard.canActivate(makeContext())).toBe(true);
  });

  it('throws when user context is missing', () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValue({ permission: Permission.CRM_VIEW }),
    } as unknown as Reflector;

    const guard = new PermissionGuard(reflector);

    expect(() => guard.canActivate(makeContext(undefined))).toThrow(
      ForbiddenException,
    );
  });

  it('allows owner access implicitly', () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValue({ permission: Permission.CRM_MANAGE }),
    } as unknown as Reflector;

    const guard = new PermissionGuard(reflector);

    const user = {
      isOwner: true,
      roleAssignments: [],
    };

    expect(guard.canActivate(makeContext(user))).toBe(true);
  });

  it('allows access when permission exists in assignments', () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValue({ permission: Permission.TENANT_SETTINGS_EDIT }),
    } as unknown as Reflector;

    const guard = new PermissionGuard(reflector);

    const user = {
      isOwner: false,
      roleAssignments: [{ permissions: [Permission.TENANT_SETTINGS_EDIT] }],
    };

    expect(guard.canActivate(makeContext(user))).toBe(true);
  });

  it('throws when permission is missing', () => {
    const reflector = {
      getAllAndOverride: jest
        .fn()
        .mockReturnValue({ permission: Permission.INCIDENT_REPORT_DELETE }),
    } as unknown as Reflector;

    const guard = new PermissionGuard(reflector);

    const user = {
      isOwner: false,
      roleAssignments: [{ permissions: [Permission.CRM_VIEW] }],
    };

    expect(() => guard.canActivate(makeContext(user))).toThrow(
      ForbiddenException,
    );
  });
});
