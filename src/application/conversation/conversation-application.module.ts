import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PersistenceModule } from '@/infrastructure/persistence/persistence.module';
import { EmailModule } from '@/infrastructure/email/email.module';
import { MarkConversationReadHandler } from './commands/mark-conversation-read/mark-conversation-read.handler';
import { ArchiveConversationHandler } from './commands/archive-conversation/archive-conversation.handler';
import { GetConversationsByTenantHandler } from './queries/get-conversations-by-tenant/get-conversations-by-tenant.handler';
import { GetConversationThreadHandler } from './queries/get-conversation-thread/get-conversation-thread.handler';
import { GetConversationsByGuestIdHandler } from './queries/get-conversations-by-guest-id/get-conversations-by-guest-id.handler';

const CommandHandlers = [MarkConversationReadHandler, ArchiveConversationHandler];
const QueryHandlers = [
  GetConversationsByTenantHandler,
  GetConversationThreadHandler,
  GetConversationsByGuestIdHandler,
];

@Module({
  imports: [CqrsModule, PersistenceModule, EmailModule],
  providers: [...CommandHandlers, ...QueryHandlers],
  exports: [...CommandHandlers, ...QueryHandlers],
})
export class ConversationApplicationModule {}
