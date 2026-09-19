import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { GuestEmailCreatedEvent } from '@/application/guest-email/events/guest-email-created.event';
import { EMAIL_SERVICE } from '@/application/shared/services/email.service';
import type { IEmailService } from '@/application/shared/services/email.service';
import { GUEST_EMAIL_REPOSITORY } from '@/domain/guest-email/repositories/guest-email.repository';
import type { GuestEmailRepository } from '@/domain/guest-email/repositories/guest-email.repository';
import { GUEST_REPOSITORY } from '@/domain/guest/repositories/guest.repository';
import type { GuestRepository } from '@/domain/guest/repositories/guest.repository';
import { GuestEmailId } from '@/domain/guest-email/value-objects/guest-email-id.vo';
import { GuestEmailStatusEnum } from '@/domain/guest-email/value-objects/guest-email-status.vo';

@Injectable()
export class GuestEmailCreatedListener {
  private readonly logger = new Logger(GuestEmailCreatedListener.name);

  constructor(
    @Inject(EMAIL_SERVICE)
    private readonly emailService: IEmailService,
    @Inject(GUEST_EMAIL_REPOSITORY)
    private readonly guestEmailRepository: GuestEmailRepository,
    @Inject(GUEST_REPOSITORY)
    private readonly guestRepository: GuestRepository,
  ) {}

  @OnEvent('guest-email.created', { async: true })
  async handleGuestEmailCreated(event: GuestEmailCreatedEvent) {
    try {
      const emailId = GuestEmailId.createFromString(event.guestEmailId);
      const guestEmail = await this.guestEmailRepository.findById(emailId);

      if (
        !guestEmail ||
        guestEmail?.getStatus() !== GuestEmailStatusEnum.PENDING
      ) {
        return;
      }

      const guest = await this.guestRepository.findById(
        guestEmail.getGuestId(),
      );
      if (!guest) {
        guestEmail.updateStatus(GuestEmailStatusEnum.FAILED);
        await this.guestEmailRepository.save(guestEmail);
        return;
      }

      // Enviamos el email usando el NOMBRE DEL REMITENTE dinámico
      const response = await this.emailService.sendEmail({
        to: [{ email: guest.getPrimaryEmail(), name: guest.getFullName() }],
        subject: event.subject,
        htmlContent: event.body,
        // Si hay senderName (nombre propiedad), lo usamos para sobreescribir el nombre visual
        sender: event.senderName
          ? {
              email: 'lymonoficial@outlook.com',
              name: event.senderName,
            }
          : undefined,
        attachments: guestEmail.getAttachments().map((att) => ({
          url: att.url,
          name: att.name,
        })),
      });

      guestEmail.updateStatus(GuestEmailStatusEnum.SENT);
      guestEmail.updateMessageId(response.messageId);
      await this.guestEmailRepository.save(guestEmail);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error procesando email ${event.guestEmailId}: ${message}`,
      );

      try {
        const emailId = GuestEmailId.createFromString(event.guestEmailId);
        const guestEmail = await this.guestEmailRepository.findById(emailId);
        if (guestEmail) {
          guestEmail.updateStatus(GuestEmailStatusEnum.FAILED);
          await this.guestEmailRepository.save(guestEmail);
        }
      } catch {
        // silently ignore cleanup errors
      }
    }
  }
}
