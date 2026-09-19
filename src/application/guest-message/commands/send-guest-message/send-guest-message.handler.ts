import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Conversation } from '@/domain/conversation/entities/conversation.entity';
import {
  CONVERSATION_REPOSITORY,
} from '@/domain/conversation/repositories/conversation.repository';
import type { ConversationRepository } from '@/domain/conversation/repositories/conversation.repository';
import { GuestMessage } from '@/domain/guest-message/entities/guest-message.entity';
import { GUEST_MESSAGE_REPOSITORY } from '@/domain/guest-message/repositories/guest-message.repository';
import type { GuestMessageRepository } from '@/domain/guest-message/repositories/guest-message.repository';
import { GuestMessageChannel } from '@/domain/guest-message/value-objects/guest-message-channel.vo';
import { GuestMessageDirection } from '@/domain/guest-message/value-objects/guest-message-direction.vo';
import { GuestMessageStatus } from '@/domain/guest-message/value-objects/guest-message-status.vo';
import { GUEST_REPOSITORY } from '@/domain/guest/repositories/guest.repository';
import type { GuestRepository } from '@/domain/guest/repositories/guest.repository';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { PROPERTY_REPOSITORY } from '@/domain/property/repositories/property.repository';
import type { PropertyRepository } from '@/domain/property/repositories/property.repository';
import { RESERVATION_REPOSITORY } from '@/domain/reservation/repositories/reservation.repository';
import type { ReservationRepository } from '@/domain/reservation/repositories/reservation.repository';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import {
  AUDIT_LOG_EVENT,
  AuditLoggedEvent,
} from '@/infrastructure/audit/events/audit-logged.event';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';
import { EmailTemplateService } from '@/infrastructure/common/email-template.service';
import {
  GUEST_MESSAGE_CREATED_EVENT,
  GuestMessageCreatedEvent,
} from '../../events/guest-message-created.event';
import { SendGuestMessageCommand } from './send-guest-message.command';

@CommandHandler(SendGuestMessageCommand)
export class SendGuestMessageHandler
  implements ICommandHandler<SendGuestMessageCommand>
{
  constructor(
    @Inject(GUEST_REPOSITORY)
    private readonly guestRepository: GuestRepository,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepository,
    @Inject(PROPERTY_REPOSITORY)
    private readonly propertyRepository: PropertyRepository,
    @Inject(GUEST_MESSAGE_REPOSITORY)
    private readonly guestMessageRepository: GuestMessageRepository,
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversationRepository: ConversationRepository,
    private readonly templateService: EmailTemplateService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: SendGuestMessageCommand): Promise<{ id: string }> {
    if (!command.body && !command.templateId) {
      throw new BadRequestException(
        'Debe proporcionar un mensaje de texto libre o un ID de plantilla',
      );
    }

    const tenantId = TenantId.createFromString(command.tenantId);
    const guestId = GuestId.createFromString(command.guestId);

    const guest = await this.guestRepository.findById(guestId);
    if (!guest?.getTenantId()?.equals?.(tenantId)) {
      throw new NotFoundException('Huésped no encontrado');
    }

    const reservations = await this.reservationRepository.findByGuestId(
      command.tenantId,
      command.guestId,
      1,
      1,
    );
    const lastReservation = reservations.length > 0 ? reservations[0] : null;

    let propertyName = 'Lymón Property';
    let checkInDate = 'No disponible';
    let checkOutDate = 'No disponible';

    if (lastReservation) {
      const property = await this.propertyRepository.findById(
        lastReservation.getPropertyId(),
      );
      if (property) {
        propertyName = property.getName();
      }
      checkInDate = lastReservation
        .getDateRange()
        .getCheckIn()
        .toLocaleDateString();
      checkOutDate = lastReservation
        .getDateRange()
        .getCheckOut()
        .toLocaleDateString();
    }

    const dynamicVariables = {
      guestName: guest.getFullName(),
      propertyName,
      checkInDate,
      checkOutDate,
      subject: command.subject || '',
      body: command.body || '',
    };

    const subject = this.templateService.resolvePlaceholders(
      command.subject || '',
      dynamicVariables,
    );
    const resolvedBody = this.templateService.resolvePlaceholders(
      command.body || '',
      dynamicVariables,
    );

    let htmlContent = '';
    if (command.templateId) {
      const templateName =
        command.templateId === 'GUEST_WELCOME'
          ? 'guest-message'
          : command.templateId;
      htmlContent = this.templateService.renderTemplate(templateName, {
        ...dynamicVariables,
        body: resolvedBody,
        subject,
      });
    } else {
      htmlContent = `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Hola ${guest.getFullName()},</h2>
          <div style="line-height: 1.6;">${resolvedBody}</div>
          <hr/>
          <p style="font-size: 0.8em; color: #666;">Enviado por ${propertyName}</p>
        </div>
      `;
    }

    const preview = resolvedBody.replace(/<[^>]{0,9999}>/g, '').slice(0, 200);

    const guestMessage = GuestMessage.create({
      tenantId,
      guestId,
      reservationId: lastReservation?.getId()?.toString() ?? undefined,
      channel: GuestMessageChannel.EMAIL,
      direction: GuestMessageDirection.OUTBOUND,
      status: GuestMessageStatus.PENDING,
      from: '',
      to: [guest.getPrimaryEmail()],
      templateId: command.templateId,
      sentBy: {
        actorId: command.sentById ?? '',
        actorEmail: command.actorEmail ?? '',
      },
      attachments: command.attachments,
      preview,
      body: null,
      bodyHtml: null,
    });

    await this.guestMessageRepository.save(guestMessage);

    let conversation = await this.conversationRepository.findByTenantAndGuest(
      command.tenantId,
      command.guestId,
    );
    conversation ??= Conversation.create({
      tenantId: command.tenantId,
      guestId: command.guestId,
      reservationId: lastReservation?.getId()?.toString() ?? null,
      subject,
    });
    conversation.appendMessage(guestMessage);
    await this.conversationRepository.save(conversation);
    guestMessage.assignConversation(conversation.getId().toString());
    await this.guestMessageRepository.save(guestMessage);

    this.eventEmitter.emit(
      GUEST_MESSAGE_CREATED_EVENT,
      new GuestMessageCreatedEvent(
        guestMessage.getId().toString(),
        subject,
        htmlContent,
        [guest.getPrimaryEmail()],
        [guest.getFullName()],
        guestMessage.getAttachments().map((att) => ({ url: att.url, name: att.name })),
        propertyName,
      ),
    );

    this.eventEmitter.emit(
      AUDIT_LOG_EVENT,
      new AuditLoggedEvent(
        command.tenantId,
        command.sentById ?? '',
        command.actorEmail ?? '',
        AuditAction.GUEST_MESSAGE_SENT,
        AuditEntityType.GUEST_EMAIL,
        guestMessage.getId().toString(),
      ),
    );

    return { id: guestMessage.getId().toString() };
  }
}
