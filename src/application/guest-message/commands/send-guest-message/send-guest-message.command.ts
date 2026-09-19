import { GuestMessageAttachment } from '@/domain/guest-message/entities/guest-message.types';

export class SendGuestMessageCommand {
  constructor(
    public readonly tenantId: string,
    public readonly guestId: string,
    public readonly subject: string,
    public readonly body?: string,
    public readonly templateId?: string,
    public readonly attachments: GuestMessageAttachment[] = [],
    public readonly sentById?: string,
    public readonly actorEmail?: string,
  ) {}
}
