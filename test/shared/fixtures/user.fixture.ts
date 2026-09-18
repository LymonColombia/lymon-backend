import {
  User,
  UserId,
  type RoleAssignment,
} from '@/domain/user/entities/user.entity';
import { Email } from '@/domain/shared/value-objects/email.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

export const USER_FIXTURE_DEFAULTS = {
  id: '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000',
  email: 'owner@example.com',
  passwordHash: 'hashed-password',
  tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
  isOwner: true,
  roleAssignments: [] as RoleAssignment[],
  emailVerified: true,
};

export function makeUser(
  overrides?: Partial<{
    id: string;
    email: string;
    passwordHash: string;
    tenantId: string;
    isOwner: boolean;
    roleAssignments: RoleAssignment[];
    emailVerified: boolean;
  }>,
): User {
  const merged = { ...USER_FIXTURE_DEFAULTS, ...overrides };
  return User.reconstitute({
    id: UserId.createFromString(merged.id),
    email: Email.create(merged.email),
    passwordHash: merged.passwordHash,
    tenantId: TenantId.createFromString(merged.tenantId),
    isOwnerFlag: merged.isOwner,
    roleAssignments: merged.roleAssignments,
    emailVerified: merged.emailVerified,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}
