export class UpdateGuestProfilePhotoCommand {
  constructor(
    public readonly guestAccountId: string,
    public readonly key: string,
  ) {}
}
