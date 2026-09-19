import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PersistenceModule } from '@/infrastructure/persistence/persistence.module';
import { CreateGuestNoteHandler } from '@/application/guest-note/commands/create-guest-note.handler';
import { UpdateGuestNoteHandler } from '@/application/guest-note/commands/update-guest-note.handler';
import { DeleteGuestNoteHandler } from '@/application/guest-note/commands/delete-guest-note.handler';
import { TogglePinGuestNoteHandler } from '@/application/guest-note/commands/toggle-pin-guest-note.handler';
import { GetGuestNotesByGuestIdHandler } from '@/application/guest-note/queries/get-guest-notes-by-guest-id/get-guest-notes-by-guest-id.handler';

const CommandHandlers = [
  CreateGuestNoteHandler,
  UpdateGuestNoteHandler,
  DeleteGuestNoteHandler,
  TogglePinGuestNoteHandler,
];
const QueryHandlers = [GetGuestNotesByGuestIdHandler];

@Module({
  imports: [CqrsModule, PersistenceModule],
  providers: [...CommandHandlers, ...QueryHandlers],
  exports: [...CommandHandlers, ...QueryHandlers],
})
export class GuestNoteApplicationModule {}
