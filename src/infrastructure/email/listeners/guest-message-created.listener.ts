import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  GUEST_MESSAGE_CREATED_EVENT,
  GuestMessageCreatedEvent,
} from '@/application/guest-message/events/guest-message-created.event';
import { EMAIL_SERVICE } from '@/application/shared/services/email.service';
import type { IEmailService } from '@/application/shared/services/email.service';
import { GUEST_MESSAGE_REPOSITORY } from '@/domain/guest-message/repositories/guest-message.repository';
import type { GuestMessageRepository } from '@/domain/guest-message/repositories/guest-message.repository';
import { GuestMessageId } from '@/domain/guest-message/value-objects/guest-message-id.vo';
import { GuestMessageStatus } from '@/domain/guest-message/value-objects/guest-message-status.vo';

@Injectable()
export class GuestMessageCreatedListener {
  private readonly logger = new Logger(GuestMessageCreatedListener.name);

  constructor(
    @Inject(EMAIL_SERVICE)
    private readonly emailService: IEmailService,
    @Inject(GUEST_MESSAGE_REPOSITORY)
    private readonly guestMessageRepository: GuestMessageRepository,
  ) {}

  @OnEvent(GUEST_MESSAGE_CREATED_EVENT, { async: true })
  async handleGuestMessageCreated(event: GuestMessageCreatedEvent) {
    try {
      const messageId = GuestMessageId.createFromString(event.guestMessageId);
      const guestMessage = await this.guestMessageRepository.findById(messageId);

      if (guestMessage?.getStatus() !== GuestMessageStatus.PENDING) {
        return;
      }

      const response = await this.emailService.sendEmail({
        to: event.to.map((email, i) => ({
          email,
          name: event.toNames[i] ?? email,
        })),
        subject: event.subject,
        htmlContent: event.htmlBody,
        sender: event.senderName
          ? { email: 'lymonoficial@outlook.com', name: event.senderName }
          : undefined,
        attachments: event.attachments,
      });

      guestMessage.updateStatus(GuestMessageStatus.SENT);
      guestMessage.updateProviderMessageId(response.messageId);
      await this.guestMessageRepository.save(guestMessage);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error procesando mensaje ${event.guestMessageId}: ${message}`,
      );

      try {
        const msg = await this.guestMessageRepository.findById(
          GuestMessageId.createFromString(event.guestMessageId),
        );
        if (msg) {
          msg.markFailed(message);
          await this.guestMessageRepository.save(msg);
        }
      } catch {
        // silently ignore cleanup errors
      }
    }
  }
}
