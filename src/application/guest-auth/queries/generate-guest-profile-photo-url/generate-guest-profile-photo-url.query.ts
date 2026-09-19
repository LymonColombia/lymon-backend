export class GenerateGuestProfilePhotoUrlQuery {
  constructor(
    public readonly guestAccountId: string,
    public readonly contentType: string,
    public readonly fileSize: number,
  ) {}
}
