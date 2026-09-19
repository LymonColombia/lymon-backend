import { PrismaRoleRepository } from '@/infrastructure/persistence/repositories/prisma-role.repository';
import { Role, RoleId } from '@/domain/role/entities/role.entity';
import { Permission } from '@/domain/role/value-objects/permission.vo';
import { prisma, resetDatabase } from './prisma.helper';

describe('PrismaRoleRepository', () => {
  const repo = new PrismaRoleRepository(prisma);
  const perms = (...values: string[]) => values as Permission[];

  beforeEach(resetDatabase);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates a role and reads its permission array back', async () => {
    await repo.save(Role.createSystem('ADMIN', perms('property:read', 'property:write')));

    const roles = await repo.findSystemRoles();
    expect(roles).toHaveLength(1);
    expect(roles[0].getName()).toBe('ADMIN');
    expect(roles[0].getPermissions()).toEqual(['property:read', 'property:write']);
  });

  it('updates an existing role instead of inserting a second one', async () => {
    await repo.save(Role.createSystem('STAFF', perms('property:read')));
    const created = (await prisma.roles.findFirst())!;
    const id = RoleId.createFromString(created.id);

    const loaded = (await repo.findById(id))!;
    await repo.save(
      Role.reconstitute(
        id,
        loaded.getName(),
        perms('property:read', 'unit:read'),
        loaded.getCreatedAt(),
        new Date(),
      ),
    );

    expect(await prisma.roles.count()).toBe(1);
    expect((await repo.findById(id))!.getPermissions()).toEqual([
      'property:read',
      'unit:read',
    ]);
  });

  it('returns null for an unknown id', async () => {
    const missing = await repo.findById(
      RoleId.createFromString('00000000-0000-4000-8000-000000000000'),
    );
    expect(missing).toBeNull();
  });
});
