export class GuestEmailCreatedEvent {
  constructor(
    public readonly guestEmailId: string,
    public readonly subject: string,
    public readonly body: string,
    public readonly senderName?: string,
  ) {}
}
