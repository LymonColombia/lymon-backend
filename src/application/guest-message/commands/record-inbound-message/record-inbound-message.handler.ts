import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainException } from '@/domain/shared/exceptions/domain.exception';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';
import {
  AUDIT_LOG_EVENT,
  AuditLoggedEvent,
} from '@/infrastructure/audit/events/audit-logged.event';
import { GuestMessage } from '@/domain/guest-message/entities/guest-message.entity';
import {
  GUEST_MESSAGE_REPOSITORY,
  GuestMessageRepository,
} from '@/domain/guest-message/repositories/guest-message.repository';
import { GuestMessageChannel } from '@/domain/guest-message/value-objects/guest-message-channel.vo';
import { GuestMessageDirection } from '@/domain/guest-message/value-objects/guest-message-direction.vo';
import { GuestMessageStatus } from '@/domain/guest-message/value-objects/guest-message-status.vo';
import {
  GUEST_REPOSITORY,
  GuestRepository,
} from '@/domain/guest/repositories/guest.repository';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { RecordInboundMessageCommand } from './record-inbound-message.command';

export const GUEST_MESSAGE_RECEIVED_EVENT = 'guest.message.received';

export class GuestMessageReceivedEvent {
  constructor(
    public readonly guestMessageId: string,
    public readonly guestId: string,
    public readonly tenantId: string,
  ) {}
}

@CommandHandler(RecordInboundMessageCommand)
export class RecordInboundMessageHandler
  implements ICommandHandler<RecordInboundMessageCommand>
{
  private readonly logger = new Logger(RecordInboundMessageHandler.name);

  constructor(
    @Inject(GUEST_REPOSITORY)
    private readonly guestRepository: GuestRepository,
    @Inject(GUEST_MESSAGE_REPOSITORY)
    private readonly guestMessageRepository: GuestMessageRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: RecordInboundMessageCommand): Promise<{ id: string }> {
    const tenantId = TenantId.createFromString(command.tenantId);

    const guest = await this.guestRepository.findByPrimaryEmail(
      tenantId,
      command.senderEmail,
    );

    const guestId = guest?.getId();

    if (!guest || !guestId) {
      this.logger.warn(
        `Inbound email from unknown sender ${command.senderEmail} for tenant ${command.tenantId} — quarantined`,
      );
      throw new DomainException(
        `No guest found for email ${command.senderEmail}`,
      );
    }

    const preview = (command.body ?? command.bodyHtml ?? '')
      .replace(/<[^>]{0,9999}>/g, '')
      .slice(0, 200);

    const message = GuestMessage.create({
      tenantId,
      guestId,
      channel: GuestMessageChannel.EMAIL,
      direction: GuestMessageDirection.INBOUND,
      status: GuestMessageStatus.DELIVERED,
      from: command.senderEmail,
      to: command.to,
      provider: command.provider,
      providerMessageId: command.providerMessageId ?? undefined,
      sentBy: { actorId: '', actorEmail: command.senderEmail },
      preview,
      body: command.body,
      bodyHtml: command.bodyHtml,
    });

    await this.guestMessageRepository.save(message);

    this.eventEmitter.emit(
      GUEST_MESSAGE_RECEIVED_EVENT,
      new GuestMessageReceivedEvent(
        message.getId().toString(),
        guestId.toString(),
        command.tenantId,
      ),
    );

    this.eventEmitter.emit(
      AUDIT_LOG_EVENT,
      new AuditLoggedEvent(
        command.tenantId,
        'system',
        command.senderEmail,
        AuditAction.GUEST_MESSAGE_INBOUND_RECEIVED,
        AuditEntityType.GUEST_EMAIL,
        message.getId().toString(),
      ),
    );

    return { id: message.getId().toString() };
  }
}
