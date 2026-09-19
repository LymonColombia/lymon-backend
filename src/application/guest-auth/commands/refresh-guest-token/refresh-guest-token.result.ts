export class RefreshGuestTokenResult {
  constructor(
    public readonly accessToken: string,
    public readonly refreshToken: string,
  ) {}
}
