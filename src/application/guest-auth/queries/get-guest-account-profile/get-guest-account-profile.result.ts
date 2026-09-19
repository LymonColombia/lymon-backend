export class GetGuestAccountProfileResult {
  constructor(
    public readonly guestAccountId: string,
    public readonly email: string,
    public readonly fullName: string,
    public readonly firstName: string | null,
    public readonly lastName: string | null,
    public readonly emailVerified: boolean,
    public readonly profilePhotoUrl: string | null,
  ) {}
}
