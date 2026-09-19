export class RemoveRoleCommand {
  constructor(
    public readonly userId: string,
    public readonly roleId: string,
    public readonly scope?: any,
    public readonly tenantId?: string,
    public readonly actorId?: string,
    public readonly actorEmail?: string,
  ) {}
}
