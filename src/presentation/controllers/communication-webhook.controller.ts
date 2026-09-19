import {
  Body,
  Controller,
  Headers,
  HttpException,
  HttpStatus,
  Inject,
  Logger,
  Post,
  Query,
  RawBody,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';
import { Public } from '@/infrastructure/auth/decorators/public.decorator';
import {
  EMAIL_WEBHOOK_VERIFIER,
  IEmailWebhookVerifier,
} from '@/application/shared/ports/email-webhook-verifier.port';
import { RecordInboundMessageCommand } from '@/application/guest-message/commands/record-inbound-message/record-inbound-message.command';
import {
  DeliveryStatusEvent,
  UpdateMessageDeliveryStatusCommand,
} from '@/application/guest-message/commands/update-message-delivery-status/update-message-delivery-status.command';
import { DomainException } from '@/domain/shared/exceptions/domain.exception';

type BrevoDeliveryEvent = {
  event: string;
  'message-id': string;
  email?: string;
};

type BrevoInboundPayload = {
  Sender?: { Address?: string };
  Subject?: string;
  RawTextBody?: string;
  RawHtmlBody?: string;
  To?: { Address?: string }[];
  MessageId?: string;
};

const BREVO_EVENT_MAP: Record<string, DeliveryStatusEvent | undefined> = {
  delivered: DeliveryStatusEvent.DELIVERED,
  soft_bounce: DeliveryStatusEvent.BOUNCED,
  hard_bounce: DeliveryStatusEvent.BOUNCED,
  opened: DeliveryStatusEvent.READ,
};

@Public()
@Controller('communications/webhook/email')
export class CommunicationWebhookController {
  private readonly logger = new Logger(CommunicationWebhookController.name);
  private readonly inboundEnabled: boolean;

  constructor(
    private readonly commandBus: CommandBus,
    private readonly configService: ConfigService,
    @Inject(EMAIL_WEBHOOK_VERIFIER)
    private readonly verifier: IEmailWebhookVerifier,
  ) {
    this.inboundEnabled =
      configService.get<string>('EMAIL_INBOUND_ENABLED') === 'true';
  }

  @Post('events')
  async receiveDeliveryEvent(
    @RawBody() rawBody: Buffer,
    @Body() payload: BrevoDeliveryEvent,
    @Headers('x-brevo-signature') signature = '',
  ): Promise<{ accepted: true; processed: boolean }> {
    if (!this.verifier.verify(rawBody, signature)) {
      this.logger.warn('Rejected delivery event: invalid signature');
      return { accepted: true, processed: false };
    }

    const event = BREVO_EVENT_MAP[payload.event];
    if (!event) {
      return { accepted: true, processed: false };
    }

    const providerMessageId = payload['message-id'];
    if (!providerMessageId) {
      return { accepted: true, processed: false };
    }

    await this.commandBus.execute(
      new UpdateMessageDeliveryStatusCommand(providerMessageId, event),
    );

    return { accepted: true, processed: true };
  }

  @Post('inbound')
  async receiveInboundEmail(
    @RawBody() rawBody: Buffer,
    @Body() payload: BrevoInboundPayload,
    @Query('tenantId') tenantId: string,
    @Headers('x-brevo-signature') signature = '',
  ): Promise<{ accepted: true; processed: boolean }> {
    if (!this.inboundEnabled) {
      this.logger.log(
        'Inbound email received but EMAIL_INBOUND_ENABLED=false — returning 501',
      );
      throw new HttpException('Not Implemented', HttpStatus.NOT_IMPLEMENTED);
    }

    if (!this.verifier.verify(rawBody, signature)) {
      this.logger.warn('Rejected inbound email: invalid signature');
      return { accepted: true, processed: false };
    }

    const senderEmail = payload.Sender?.Address;
    if (!senderEmail || !tenantId) {
      return { accepted: true, processed: false };
    }

    const to = (payload.To ?? [])
      .map((t) => t.Address)
      .filter((a): a is string => !!a);

    try {
      await this.commandBus.execute(
        new RecordInboundMessageCommand(
          tenantId,
          senderEmail,
          payload.Subject ?? '',
          payload.RawTextBody ?? null,
          payload.RawHtmlBody ?? null,
          to,
          payload.MessageId ?? null,
          'brevo',
        ),
      );
    } catch (err) {
      if (err instanceof DomainException) {
        this.logger.warn(`Inbound quarantined: ${err.message}`);
        return { accepted: true, processed: false };
      }
      throw err;
    }

    return { accepted: true, processed: true };
  }
}
