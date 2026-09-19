export const GUEST_MESSAGE_CREATED_EVENT = 'guest-message.created';

export class GuestMessageCreatedEvent {
  constructor(
    public readonly guestMessageId: string,
    public readonly subject: string,
    public readonly htmlBody: string,
    public readonly to: string[],
    public readonly toNames: string[],
    public readonly attachments: { url: string; name: string }[] = [],
    public readonly senderName?: string,
  ) {}
}
