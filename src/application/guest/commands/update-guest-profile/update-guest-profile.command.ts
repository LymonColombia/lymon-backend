export class UpdateGuestProfileCommand {
  constructor(
    public readonly tenantId: string,
    public readonly guestId: string,
    public readonly fullName?: string,
    public readonly firstName?: string | null,
    public readonly lastName?: string | null,
    public readonly primaryEmail?: string,
    public readonly phone?: string | null,
    public readonly identity?: {
      documentType?: string;
      documentNumber?: string;
      countryCode?: string;
    },
  ) {}
}
