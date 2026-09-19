export class GetGuestLifecycleStatusQuery {
  constructor(
    public readonly tenantId: string,
    public readonly guestIds: string[],
  ) {}
}