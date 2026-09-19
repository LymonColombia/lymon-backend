import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PersistenceModule } from '@/infrastructure/persistence/persistence.module';
import { SaveGuestEmailHandler } from './commands/save-guest-email.handler';
import { GetGuestEmailsByGuestIdHandler } from './queries/get-guest-emails-by-guest-id/get-guest-emails-by-guest-id.handler';

import { EmailModule } from '@/infrastructure/email/email.module';

const CommandHandlers = [SaveGuestEmailHandler];
const QueryHandlers = [GetGuestEmailsByGuestIdHandler];

@Module({
  imports: [CqrsModule, PersistenceModule, EmailModule],
  providers: [...CommandHandlers, ...QueryHandlers],
  exports: [...CommandHandlers, ...QueryHandlers],
})
export class GuestEmailApplicationModule {}
