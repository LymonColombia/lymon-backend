import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeleteGuestNoteCommand } from './delete-guest-note.command';
import {
  GUEST_NOTE_REPOSITORY,
  type GuestNoteRepository,
} from '@/domain/guest-note/repositories/guest-note.repository';
import { GuestNoteId } from '@/domain/guest-note/value-objects/guest-note-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import {
  AUDIT_LOG_EVENT,
  AuditLoggedEvent,
} from '@/infrastructure/audit/events/audit-logged.event';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';

@CommandHandler(DeleteGuestNoteCommand)
export class DeleteGuestNoteHandler implements ICommandHandler<
  DeleteGuestNoteCommand,
  void
> {
  constructor(
    @Inject(GUEST_NOTE_REPOSITORY)
    private readonly guestNoteRepository: GuestNoteRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: DeleteGuestNoteCommand): Promise<void> {
    const tenantId = TenantId.createFromString(command.tenantId);
    const noteId = GuestNoteId.createFromString(command.noteId);

    const guestNote = await this.guestNoteRepository.findById(noteId, tenantId);
    if (!guestNote) {
      throw new NotFoundException('Guest note not found');
    }

    await this.guestNoteRepository.delete(noteId, tenantId);

    this.eventEmitter.emit(
      AUDIT_LOG_EVENT,
      new AuditLoggedEvent(
        command.tenantId,
        command.actorId,
        command.actorEmail,
        AuditAction.GUEST_NOTE_DELETED,
        AuditEntityType.GUEST_NOTE,
        command.noteId,
      ),
    );
  }
}
