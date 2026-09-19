export class DeleteExperienceCommand {
  constructor(
    public readonly experienceId: string,
    public readonly tenantId: string,
    public readonly actorId: string,
    public readonly actorEmail: string,
  ) {}
}
