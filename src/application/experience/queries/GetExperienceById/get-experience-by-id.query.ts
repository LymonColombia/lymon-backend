export class GetExperienceByIdQuery {
  constructor(
    public readonly experienceId: string,
    public readonly tenantId: string,
  ) {}
}
