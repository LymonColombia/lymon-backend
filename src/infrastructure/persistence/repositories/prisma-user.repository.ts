import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Email } from '@/domain/shared/value-objects/email.vo';
import {
  RoleAssignment,
  User,
  UserId,
  UserScope,
} from '@/domain/user/entities/user.entity';
import { UserRepository } from '@/domain/user/repositories/user.repository';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import {
  Prisma,
  type users as UserRow,
  type user_role_assignments as RoleAssignmentRow,
} from '@/infrastructure/persistence/prisma/generated/client';

type UserWithAssignments = UserRow & {
  user_role_assignments: RoleAssignmentRow[];
};

const WITH_ASSIGNMENTS = { user_role_assignments: true } as const;

type NewAssignmentRow = Prisma.user_role_assignmentsCreateManyInput;

@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(user: User): Promise<void> {
    const id = user.getId()?.toString();
    const tenantId = user.getTenantId().toString();

    const data = {
      email: user.getEmail().toString(),
      password_hash: user.getPasswordHash(),
      is_owner: user.isOwner(),
      email_verified: user.isEmailVerified(),
      full_name: user.getFullName() ?? null,
      document: user.getDocument() ?? null,
      tutorial_completed: user.getTutorialCompleted(),
      reset_password_token: user.getResetPasswordToken() ?? null,
      reset_password_expires: user.getResetPasswordExpires() ?? null,
      password_changed_at: user.getPasswordChangedAt() ?? null,
      updated_at: new Date(),
      deleted_at: user.getDeletedAt(),
    };

    try {
      await this.prisma.$transaction(async (tx) => {
        const row = id
          ? await tx.users.update({ where: { id }, data })
          : await tx.users.create({
              data: { ...data, tenant_id: tenantId, created_at: new Date() },
            });

        await this.replaceRoleAssignments(
          tx,
          tenantId,
          row.id,
          user.getRoleAssignments(),
        );
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'This email is already registered for an active user in this tenant.',
        );
      }
      throw error;
    }
  }

  /**
   * The domain holds one RoleAssignment per role with an array of resource ids; the
   * table holds one row per resource so the scope target can be a real FK. The list is
   * replaced wholesale, which is what updateRoleAssignments() means.
   */
  private async replaceRoleAssignments(
    tx: Prisma.TransactionClient,
    tenantId: string,
    userId: string,
    assignments: RoleAssignment[],
  ): Promise<void> {
    await tx.user_role_assignments.deleteMany({ where: { user_id: userId } });
    if (assignments.length === 0) return;

    // UNIT scope carries only unit ids, but the row needs its property too.
    const unitIds = assignments.flatMap((assignment) =>
      assignment.scope.type === 'UNIT' ? assignment.scope.resourceIds : [],
    );
    const propertyByUnit = new Map<string, string>();
    if (unitIds.length > 0) {
      const units = await tx.units.findMany({
        where: { id: { in: unitIds }, tenant_id: tenantId },
        select: { id: true, property_id: true },
      });
      for (const unit of units) propertyByUnit.set(unit.id, unit.property_id);
    }

    const rows = assignments.flatMap((assignment): NewAssignmentRow[] => {
      const base = {
        tenant_id: tenantId,
        user_id: userId,
        role_id: assignment.roleId,
        scope_type: assignment.scope.type,
      };

      if (assignment.scope.type === 'TENANT') {
        return [{ ...base, property_id: null, unit_id: null }];
      }

      if (assignment.scope.type === 'PROPERTY') {
        return assignment.scope.resourceIds.map((propertyId) => ({
          ...base,
          property_id: propertyId,
          unit_id: null,
        }));
      }

      return assignment.scope.resourceIds.map((unitId) => {
        const propertyId = propertyByUnit.get(unitId);
        if (!propertyId) {
          throw new BadRequestException(
            `Cannot assign a UNIT-scoped role: unit ${unitId} does not belong to this tenant.`,
          );
        }
        return { ...base, property_id: propertyId, unit_id: unitId };
      });
    });

    await tx.user_role_assignments.createMany({ data: rows });
  }

  async findById(id: UserId): Promise<User | null> {
    const row = await this.prisma.users.findFirst({
      where: { id: id.toString(), deleted_at: null },
      include: WITH_ASSIGNMENTS,
    });
    return row ? this.toDomainEntity(row) : null;
  }

  async findByEmail(email: Email): Promise<User | null> {
    const row = await this.prisma.users.findFirst({
      where: { email: email.toString(), deleted_at: null },
      include: WITH_ASSIGNMENTS,
    });
    return row ? this.toDomainEntity(row) : null;
  }

  async findByTenantId(tenantId: TenantId): Promise<User[]> {
    const rows = await this.prisma.users.findMany({
      where: { tenant_id: tenantId.toString(), deleted_at: null },
      include: WITH_ASSIGNMENTS,
    });
    return rows.map((row) => this.toDomainEntity(row));
  }

  async findByEmailAndTenantId(
    email: Email,
    tenantId: TenantId,
  ): Promise<User | null> {
    const row = await this.prisma.users.findFirst({
      where: {
        email: email.toString(),
        tenant_id: tenantId.toString(),
        deleted_at: null,
      },
      include: WITH_ASSIGNMENTS,
    });
    return row ? this.toDomainEntity(row) : null;
  }

  async findByResetToken(hashedToken: string): Promise<User | null> {
    const row = await this.prisma.users.findFirst({
      where: { reset_password_token: hashedToken, deleted_at: null },
      include: WITH_ASSIGNMENTS,
    });
    return row ? this.toDomainEntity(row) : null;
  }

  private toDomainEntity(row: UserWithAssignments): User {
    return User.reconstitute({
      id: UserId.createFromString(row.id),
      email: Email.create(row.email),
      passwordHash: row.password_hash,
      tenantId: TenantId.createFromString(row.tenant_id),
      isOwnerFlag: row.is_owner,
      roleAssignments: this.toRoleAssignments(row.user_role_assignments),
      emailVerified: row.email_verified,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      resetPasswordToken: row.reset_password_token ?? undefined,
      resetPasswordExpires: row.reset_password_expires ?? undefined,
      passwordChangedAt: row.password_changed_at ?? undefined,
      deletedAt: row.deleted_at,
      fullName: row.full_name ?? undefined,
      document: row.document ?? undefined,
      tutorialCompleted: row.tutorial_completed,
    });
  }

  /** Inverse of replaceRoleAssignments: regroup the rows back into resource arrays. */
  private toRoleAssignments(rows: RoleAssignmentRow[]): RoleAssignment[] {
    const grouped = new Map<string, RoleAssignment>();

    for (const row of rows) {
      const key = `${row.role_id}:${row.scope_type}`;
      let assignment = grouped.get(key);

      if (!assignment) {
        assignment = {
          roleId: row.role_id,
          scope:
            row.scope_type === 'TENANT'
              ? { type: 'TENANT' }
              : ({ type: row.scope_type, resourceIds: [] } as UserScope),
        };
        grouped.set(key, assignment);
      }

      if (assignment.scope.type === 'PROPERTY' && row.property_id) {
        assignment.scope.resourceIds.push(row.property_id);
      } else if (assignment.scope.type === 'UNIT' && row.unit_id) {
        assignment.scope.resourceIds.push(row.unit_id);
      }
    }

    return [...grouped.values()];
  }
}
