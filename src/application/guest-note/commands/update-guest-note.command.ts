import { GuestNoteTypeEnum } from '@/domain/guest-note/value-objects/guest-node-type.vo';

export class UpdateGuestNoteCommand {
  constructor(
    public readonly tenantId: string,
    public readonly noteId: string,
    public readonly actorId: string,
    public readonly actorEmail: string,
    public readonly note: string | undefined,
    public readonly type: GuestNoteTypeEnum | undefined,
  ) {}
}
