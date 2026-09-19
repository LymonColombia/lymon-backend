export class SaveGuestPreferencesResult {
  constructor(
    public readonly guestId: string,
    public readonly wasCreated: boolean,
  ) {}
}
