import { ConflictException } from '@nestjs/common';
import { PrismaUserRepository } from '@/infrastructure/persistence/repositories/prisma-user.repository';
import { User, UserId } from '@/domain/user/entities/user.entity';
import { Email } from '@/domain/shared/value-objects/email.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { prisma, resetDatabase } from './prisma.helper';
import { seedProperty, seedRole, seedTenant, seedUnit } from './fixtures';

describe('PrismaUserRepository', () => {
  const repo = new PrismaUserRepository(prisma);

  let tenantId: string;
  let roleId: string;

  beforeEach(async () => {
    await resetDatabase();
    tenantId = (await seedTenant()).id;
    roleId = (await seedRole()).id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const owner = (email = 'owner@costa.com') =>
    User.createOwner(
      Email.create(email),
      'hash',
      TenantId.createFromString(tenantId),
    );

  it('round-trips an owner with no role assignments', async () => {
    await repo.save(owner());

    const found = await repo.findByEmail(Email.create('owner@costa.com'));
    expect(found).not.toBeNull();
    expect(found!.isOwner()).toBe(true);
    expect(found!.getRoleAssignments()).toEqual([]);
    expect(found!.getTenantId().toString()).toBe(tenantId);
  });

  it('stores a PROPERTY-scoped assignment as one row per resource and regroups it', async () => {
    const propertyA = await seedProperty(tenantId, 'Playa Norte');
    const propertyB = await seedProperty(tenantId, 'Playa Sur');

    await repo.save(
      User.createStaff(
        Email.create('staff@costa.com'),
        'hash',
        TenantId.createFromString(tenantId),
        [
          {
            roleId,
            scope: { type: 'PROPERTY', resourceIds: [propertyA.id, propertyB.id] },
          },
        ],
      ),
    );

    expect(await prisma.user_role_assignments.count()).toBe(2);

    const found = (await repo.findByEmail(Email.create('staff@costa.com')))!;
    const assignments = found.getRoleAssignments();
    expect(assignments).toHaveLength(1);
    expect(assignments[0].roleId).toBe(roleId);
    expect(assignments[0].scope.type).toBe('PROPERTY');
    expect(
      (assignments[0].scope as { resourceIds: string[] }).resourceIds.sort(),
    ).toEqual([propertyA.id, propertyB.id].sort());
  });

  it('resolves the owning property when the scope is UNIT', async () => {
    const property = await seedProperty(tenantId);
    const unit = await seedUnit(tenantId, property.id);

    await repo.save(
      User.createStaff(
        Email.create('staff@costa.com'),
        'hash',
        TenantId.createFromString(tenantId),
        [{ roleId, scope: { type: 'UNIT', resourceIds: [unit.id] } }],
      ),
    );

    const row = (await prisma.user_role_assignments.findFirst())!;
    expect(row.scope_type).toBe('UNIT');
    expect(row.unit_id).toBe(unit.id);
    expect(row.property_id).toBe(property.id);

    const found = (await repo.findByEmail(Email.create('staff@costa.com')))!;
    expect(found.getRoleAssignments()[0].scope).toEqual({
      type: 'UNIT',
      resourceIds: [unit.id],
    });
  });

  it('replaces the assignment list on update rather than appending', async () => {
    const property = await seedProperty(tenantId);
    await repo.save(owner());
    const created = (await prisma.users.findFirst())!;

    const loaded = (await repo.findById(UserId.createFromString(created.id)))!;
    loaded.updateRoleAssignments([
      { roleId, scope: { type: 'PROPERTY', resourceIds: [property.id] } },
    ]);
    await repo.save(loaded);
    expect(await prisma.user_role_assignments.count()).toBe(1);

    loaded.updateRoleAssignments([{ roleId, scope: { type: 'TENANT' } }]);
    await repo.save(loaded);

    const rows = await prisma.user_role_assignments.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0].scope_type).toBe('TENANT');
    expect(rows[0].property_id).toBeNull();
  });

  it('rejects a duplicate active email in the same tenant', async () => {
    await repo.save(owner());
    await expect(repo.save(owner())).rejects.toBeInstanceOf(ConflictException);
  });

  it('frees the email once the user is soft-deleted', async () => {
    await repo.save(owner());
    const created = (await prisma.users.findFirst())!;
    await prisma.users.update({
      where: { id: created.id },
      data: { deleted_at: new Date() },
    });

    await expect(repo.save(owner())).resolves.toBeUndefined();
    expect(await repo.findById(UserId.createFromString(created.id))).toBeNull();
    expect(await repo.findByTenantId(TenantId.createFromString(tenantId))).toHaveLength(1);
  });

  it('finds by reset token and by email + tenant', async () => {
    const user = owner();
    user.setResetToken('hashed-token', new Date(Date.now() + 60_000));
    await repo.save(user);

    expect(await repo.findByResetToken('hashed-token')).not.toBeNull();
    expect(await repo.findByResetToken('other')).toBeNull();
    expect(
      await repo.findByEmailAndTenantId(
        Email.create('owner@costa.com'),
        TenantId.createFromString(tenantId),
      ),
    ).not.toBeNull();
  });
});
