import {
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GuestNote } from '@/domain/guest-note/entities/guest-note.entity';
import { GuestNoteTypeEnum } from '@/domain/guest-note/value-objects/guest-node-type.vo';
import {
  GUEST_NOTE_REPOSITORY,
  type GuestNoteRepository,
} from '@/domain/guest-note/repositories/guest-note.repository';
import {
  GUEST_REPOSITORY,
  type GuestRepository,
} from '@/domain/guest/repositories/guest.repository';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { CreateGuestNoteCommand } from '@/application/guest-note/commands/create-guest-note.command';
import { CreateGuestNoteResult } from '@/application/guest-note/commands/create-guest-note.result';
import {
  AUDIT_LOG_EVENT,
  AuditLoggedEvent,
} from '@/infrastructure/audit/events/audit-logged.event';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';

@CommandHandler(CreateGuestNoteCommand)
export class CreateGuestNoteHandler implements ICommandHandler<CreateGuestNoteCommand> {
  constructor(
    @Inject(GUEST_NOTE_REPOSITORY)
    private readonly guestNoteRepository: GuestNoteRepository,
    @Inject(GUEST_REPOSITORY)
    private readonly guestRepository: GuestRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    command: CreateGuestNoteCommand,
  ): Promise<CreateGuestNoteResult> {
    if (!command.tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }

    if (!command.note || command.note.trim() === '') {
      throw new BadRequestException('Note content cannot be empty');
    }

    if (!Object.values(GuestNoteTypeEnum).includes(command.type)) {
      throw new BadRequestException('Invalid note type');
    }

    const tenantId = TenantId.createFromString(command.tenantId);
    const guestId = GuestId.createFromString(command.guestId);

    // Verificamos que el Guest realmente exista
    const guest = await this.guestRepository.findById(guestId);
    if (!guest) {
      throw new NotFoundException('Guest not found');
    }

    // Verificamos que el creador/tenant tenga permiso sobre el huésped
    if (!guest.getTenantId().equals(tenantId)) {
      throw new ForbiddenException(
        'Creator not authorized for this guest tenant',
      );
    }

    const guestNote = GuestNote.create({
      tenantId,
      guestId,
      note: command.note,
      type: command.type,
      status: command.status,
      createdBy: command.createdBy,
    });

    await this.guestNoteRepository.save(guestNote);

    this.eventEmitter.emit(
      AUDIT_LOG_EVENT,
      new AuditLoggedEvent(
        command.tenantId,
        command.createdBy,
        command.actorEmail,
        AuditAction.GUEST_NOTE_CREATED,
        AuditEntityType.GUEST_NOTE,
        guestNote.getId()?.toString(),
      ),
    );

    return new CreateGuestNoteResult(guestNote.getId()?.toString() || '');
  }
}
