import { RoleAssignment } from '@/domain/user/entities/user.entity';

export class UpdateStaffCommand {
  constructor(
    public readonly userId: string,
    public readonly roleAssignments?: RoleAssignment[],
    public readonly addPermissions?: RoleAssignment[],
    public readonly removePermissions?: RoleAssignment[],
    public readonly fullName?: string,
    public readonly document?: string,
    public readonly tenantId?: string,
    public readonly actorId?: string,
    public readonly actorEmail?: string,
  ) {}
}
