export class RecordInboundMessageCommand {
  constructor(
    public readonly tenantId: string,
    public readonly senderEmail: string,
    public readonly subject: string,
    public readonly body: string | null,
    public readonly bodyHtml: string | null,
    public readonly to: string[],
    public readonly providerMessageId: string | null,
    public readonly provider: string,
  ) {}
}
