export class UpdateGuestAccountProfileCommand {
  constructor(
    public readonly guestAccountId: string,
    public readonly firstName?: string | null,
    public readonly lastName?: string | null,
    public readonly phone?: string | null,
    public readonly email?: string,
  ) {}
}
