import { GetSystemRolesQueryHandler } from '@/application/role/queries/GetSystemRoles/get-system-roles.query-handler';
import {
  GetSystemRolesResult,
  RoleDto,
} from '@/application/role/queries/GetSystemRoles/get-system-roles.result';
import { RoleRepository } from '@/domain/role/repositories/role.repository';
import { Role, RoleId } from '@/domain/role/entities/role.entity';
import { Permission } from '@/domain/role/value-objects/permission.vo';
import { createRoleRepositoryMock } from '@test/shared/mocks/repositories/role-repository.mock';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeRole(id: string, name: string, permissions: Permission[]): Role {
  return Role.reconstitute(
    RoleId.createFromString(id),
    name,
    permissions,
    new Date(),
    new Date(),
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GetSystemRolesQueryHandler', () => {
  let handler: GetSystemRolesQueryHandler;
  let roleRepository: jest.Mocked<RoleRepository>;

  beforeEach(() => {
    roleRepository = createRoleRepositoryMock();
    handler = new GetSystemRolesQueryHandler(roleRepository);
  });

  describe('when system roles exist', () => {
    it('returns a GetSystemRolesResult with RoleDtos containing id, name and permissions', async () => {
      const adminPermissions = [
        Permission.PROPERTY_VIEW,
        Permission.PROPERTY_CREATE,
        Permission.UNIT_VIEW,
      ];
      const staffPermissions = [
        Permission.RESERVATION_VIEW,
        Permission.RESERVATION_CREATE,
      ];

      roleRepository.findSystemRoles.mockResolvedValue([
        makeRole('role-admin', 'ADMIN', adminPermissions),
        makeRole('role-staff', 'STAFF', staffPermissions),
      ]);

      const result = await handler.execute();

      expect(result).toBeInstanceOf(GetSystemRolesResult);
      expect(result.roles).toHaveLength(2);

      expect(result.roles[0]).toBeInstanceOf(RoleDto);
      expect(result.roles[0].id).toBe('role-admin');
      expect(result.roles[0].name).toBe('ADMIN');
      expect(result.roles[0].permissions).toEqual(adminPermissions);

      expect(result.roles[1]).toBeInstanceOf(RoleDto);
      expect(result.roles[1].id).toBe('role-staff');
      expect(result.roles[1].name).toBe('STAFF');
      expect(result.roles[1].permissions).toEqual(staffPermissions);
    });
  });

  describe('when no system roles exist', () => {
    it('returns a GetSystemRolesResult with an empty array', async () => {
      roleRepository.findSystemRoles.mockResolvedValue([]);

      const result = await handler.execute();

      expect(result).toBeInstanceOf(GetSystemRolesResult);
      expect(result.roles).toEqual([]);
    });
  });
});
