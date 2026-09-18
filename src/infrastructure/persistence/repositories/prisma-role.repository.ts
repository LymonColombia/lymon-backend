import { Injectable } from '@nestjs/common';
import { Role, RoleId } from '@/domain/role/entities/role.entity';
import { RoleRepository } from '@/domain/role/repositories/role.repository';
import { Permission } from '@/domain/role/value-objects/permission.vo';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import { type roles as RoleRow } from '@/infrastructure/persistence/prisma/generated/client';

@Injectable()
export class PrismaRoleRepository implements RoleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(role: Role): Promise<void> {
    const id = role.getId()?.toString();
    const data = {
      name: role.getName(),
      permissions: role.getPermissions(),
      updated_at: new Date(),
    };

    if (id) {
      await this.prisma.roles.update({ where: { id }, data });
      return;
    }

    await this.prisma.roles.create({ data: { ...data, created_at: new Date() } });
  }

  async findById(id: RoleId): Promise<Role | null> {
    const row = await this.prisma.roles.findUnique({ where: { id: id.toString() } });
    return row ? this.toDomainEntity(row) : null;
  }

  async findSystemRoles(): Promise<Role[]> {
    // ponytail: no is_system column — every role is a system role (ADR 006).
    const rows = await this.prisma.roles.findMany();
    return rows.map((row) => this.toDomainEntity(row));
  }

  private toDomainEntity(row: RoleRow): Role {
    return Role.reconstitute(
      RoleId.createFromString(row.id),
      row.name,
      row.permissions as Permission[],
      row.created_at,
      row.updated_at,
    );
  }
}
