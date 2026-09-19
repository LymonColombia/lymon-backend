export class AssignGuestTagsCommand {
  constructor(
    public readonly guestId: string,
    public readonly tags: string[],
    public readonly tenantId: string,
    public readonly actorId: string,
    public readonly actorEmail: string,
  ) {}
}
