import { GuestNoteTypeEnum } from '@/domain/guest-note/value-objects/guest-node-type.vo';
import { GuestNoteStatusEnum } from '@/domain/guest-note/value-objects/guest-node-status.vo';

export class CreateGuestNoteCommand {
  constructor(
    public readonly tenantId: string,
    public readonly guestId: string,
    public readonly note: string,
    public readonly type: GuestNoteTypeEnum,
    public readonly createdBy: string,
    public readonly actorEmail: string,
    public readonly status?: GuestNoteStatusEnum,
  ) {}
}
