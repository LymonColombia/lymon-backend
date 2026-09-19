import { GuestEmailAttachment } from '@/domain/guest-email/entities/guest-email.types';

export class SendGuestMessageCommand {
  constructor(
    public readonly tenantId: string,
    public readonly guestId: string,
    public readonly subject: string,
    public readonly body?: string,
    public readonly templateId?: string,
    public readonly attachments: GuestEmailAttachment[] = [],
    public readonly sentById?: string,
    public readonly actorEmail?: string,
  ) {}
}
