import { RoleAssignment } from '@/domain/user/entities/user.entity';

export class InviteStaffCommand {
  constructor(
    public readonly email: string,
    public readonly password: string,
    public readonly tenantId: string,
    public readonly roleAssignments: RoleAssignment[],
    public readonly actorId: string,
    public readonly actorEmail: string,
    public readonly fullName: string,
    public readonly document: string,
  ) {}
}
