import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  GUEST_MESSAGE_REPOSITORY,
  GuestMessageRepository,
} from '@/domain/guest-message/repositories/guest-message.repository';
import { GuestMessageStatus } from '@/domain/guest-message/value-objects/guest-message-status.vo';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';
import {
  AUDIT_LOG_EVENT,
  AuditLoggedEvent,
} from '@/infrastructure/audit/events/audit-logged.event';
import {
  DeliveryStatusEvent,
  UpdateMessageDeliveryStatusCommand,
} from './update-message-delivery-status.command';

const EVENT_TO_STATUS: Record<DeliveryStatusEvent, GuestMessageStatus> = {
  [DeliveryStatusEvent.DELIVERED]: GuestMessageStatus.DELIVERED,
  [DeliveryStatusEvent.BOUNCED]: GuestMessageStatus.BOUNCED,
  [DeliveryStatusEvent.READ]: GuestMessageStatus.READ,
};

@CommandHandler(UpdateMessageDeliveryStatusCommand)
export class UpdateMessageDeliveryStatusHandler
  implements ICommandHandler<UpdateMessageDeliveryStatusCommand>
{
  private readonly logger = new Logger(UpdateMessageDeliveryStatusHandler.name);

  constructor(
    @Inject(GUEST_MESSAGE_REPOSITORY)
    private readonly guestMessageRepository: GuestMessageRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: UpdateMessageDeliveryStatusCommand): Promise<void> {
    const message = await this.guestMessageRepository.findByProviderMessageId(
      command.providerMessageId,
    );

    if (!message) {
      this.logger.warn(
        `Delivery event '${command.event}' for unknown providerMessageId ${command.providerMessageId} — ignored`,
      );
      return;
    }

    if (message.getStatus() === EVENT_TO_STATUS[command.event]) {
      return;
    }

    switch (command.event) {
      case DeliveryStatusEvent.DELIVERED:
        message.markDelivered();
        break;
      case DeliveryStatusEvent.BOUNCED:
        message.markBounced();
        break;
      case DeliveryStatusEvent.READ:
        message.markRead();
        break;
    }

    await this.guestMessageRepository.save(message);

    this.eventEmitter.emit(
      AUDIT_LOG_EVENT,
      new AuditLoggedEvent(
        message.getTenantId().toString(),
        'system',
        'system',
        AuditAction.GUEST_MESSAGE_DELIVERY_STATUS_UPDATED,
        AuditEntityType.GUEST_EMAIL,
        message.getId().toString(),
      ),
    );
  }
}
