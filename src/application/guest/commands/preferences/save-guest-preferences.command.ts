export class SaveGuestPreferencesCommand {
  constructor(
    public readonly tenantId: string,
    public readonly guestId: string,
    public readonly catalogItemIds: string[],
    public readonly activePlan: string,
    public readonly actorId: string,
    public readonly actorEmail: string,
  ) {}
}
