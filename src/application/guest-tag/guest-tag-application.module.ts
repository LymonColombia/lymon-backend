import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PersistenceModule } from '@/infrastructure/persistence/persistence.module';
import { GetGuestTagsHandler } from '@/application/guest-tag/queries/get-guest-tags/get-guest-tags.handler';

const QueryHandlers = [GetGuestTagsHandler];

@Module({
  imports: [CqrsModule, PersistenceModule],
  providers: [...QueryHandlers],
  exports: [...QueryHandlers],
})
export class GuestTagApplicationModule {}
