import { ConversationSummaryDto } from '../get-conversations-by-tenant/get-conversations-by-tenant.result';

export class ConversationMessageDto {
  constructor(
    public readonly id: string,
    public readonly direction: string,
    public readonly channel: string,
    public readonly status: string,
    public readonly preview: string,
    public readonly body: string | null,
    public readonly bodyResolved: boolean,
    public readonly sentBy: { actorId: string; actorEmail: string },
    public readonly attachments: { url: string; name: string; type?: string }[],
    public readonly createdAt: Date,
  ) {}
}

export class ConversationThreadResult {
  constructor(
    public readonly conversation: ConversationSummaryDto,
    public readonly messages: ConversationMessageDto[],
  ) {}
}
