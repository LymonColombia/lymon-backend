import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UpdateGuestNoteCommand } from './update-guest-note.command';
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

@CommandHandler(UpdateGuestNoteCommand)
export class UpdateGuestNoteHandler implements ICommandHandler<
  UpdateGuestNoteCommand,
  void
> {
  constructor(
    @Inject(GUEST_NOTE_REPOSITORY)
    private readonly guestNoteRepository: GuestNoteRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: UpdateGuestNoteCommand): Promise<void> {
    if (command.note === undefined && command.type === undefined) {
      throw new BadRequestException(
        'At least one field (note or type) must be provided',
      );
    }

    const tenantId = TenantId.createFromString(command.tenantId);
    const noteId = GuestNoteId.createFromString(command.noteId);

    const guestNote = await this.guestNoteRepository.findById(noteId, tenantId);
    if (!guestNote) {
      throw new NotFoundException('Guest note not found');
    }

    if (command.note !== undefined) {
      guestNote.updateContent(command.note);
    }

    if (command.type !== undefined) {
      guestNote.changeType(command.type);
    }

    await this.guestNoteRepository.save(guestNote);

    this.eventEmitter.emit(
      AUDIT_LOG_EVENT,
      new AuditLoggedEvent(
        command.tenantId,
        command.actorId,
        command.actorEmail,
        AuditAction.GUEST_NOTE_UPDATED,
        AuditEntityType.GUEST_NOTE,
        command.noteId,
      ),
    );
  }
}
