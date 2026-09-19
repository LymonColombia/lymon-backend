export enum DeliveryStatusEvent {
  DELIVERED = 'delivered',
  BOUNCED = 'bounced',
  READ = 'read',
}

export class UpdateMessageDeliveryStatusCommand {
  constructor(
    public readonly providerMessageId: string,
    public readonly event: DeliveryStatusEvent,
  ) {}
}
