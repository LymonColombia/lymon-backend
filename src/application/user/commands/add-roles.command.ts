import { RoleAssignment } from '@/domain/user/entities/user.entity';

export class AddRolesCommand {
  constructor(
    public readonly userId: string,
    public readonly roleAssignments: RoleAssignment[],
    public readonly tenantId?: string,
    public readonly actorId?: string,
    public readonly actorEmail?: string,
  ) {}
}
