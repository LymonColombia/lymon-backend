export class GetGuestRecencyQuery {
  constructor(
    public readonly tenantId: string,
    public readonly guestId: string,
  ) {}
}
