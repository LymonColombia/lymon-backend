export class TogglePinGuestNoteCommand {
  constructor(
    public readonly tenantId: string,
    public readonly noteId: string,
    public readonly actorId: string,
    public readonly actorEmail: string,
  ) {}
}
