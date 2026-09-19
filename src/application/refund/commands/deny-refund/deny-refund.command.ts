export class DenyRefundCommand {
  constructor(
    public readonly refundRequestId: string,
    public readonly tenantId: string,
    public readonly actorId: string,
    public readonly actorEmail: string,
  ) {}
}
