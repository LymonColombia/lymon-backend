import { GuestEmailStatusEnum } from '@/domain/guest-email/value-objects/guest-email-status.vo';
import { GuestEmailAttachment } from '@/domain/guest-email/entities/guest-email.types';

export class SaveGuestEmailCommand {
  constructor(
    public readonly tenantId: string,
    public readonly guestId: string,
    public readonly subject: string,
    public readonly status: GuestEmailStatusEnum,
    public readonly attachments: GuestEmailAttachment[] = [],
    public readonly sentById?: string,
  ) {}
}
