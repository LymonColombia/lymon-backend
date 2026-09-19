import { ConversationSummaryDto } from '../get-conversations-by-tenant/get-conversations-by-tenant.result';

export class GetConversationsByGuestIdResult {
  constructor(public readonly items: ConversationSummaryDto[]) {}
}
