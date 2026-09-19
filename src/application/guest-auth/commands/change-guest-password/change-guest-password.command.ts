export class ChangeGuestPasswordCommand {
  constructor(
    public readonly guestAccountId: string,
    public readonly currentPassword: string,
    public readonly newPassword: string,
  ) {}
}
