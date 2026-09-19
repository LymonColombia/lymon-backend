import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';
import { CommunicationWebhookController } from '@/presentation/controllers/communication-webhook.controller';
import { EMAIL_WEBHOOK_VERIFIER } from '@/application/shared/ports/email-webhook-verifier.port';
import { RecordInboundMessageCommand } from '@/application/guest-message/commands/record-inbound-message/record-inbound-message.command';
import {
  DeliveryStatusEvent,
  UpdateMessageDeliveryStatusCommand,
} from '@/application/guest-message/commands/update-message-delivery-status/update-message-delivery-status.command';
import { DomainException } from '@/domain/shared/exceptions/domain.exception';

const TENANT_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000';
const VALID_SIGNATURE = 'valid-sig';
const RAW_BODY = Buffer.from('{"event":"delivered"}');

function makeDeliveryPayload(event: string, messageId = 'brevo-msg-001') {
  return { event, 'message-id': messageId };
}

function makeInboundPayload(overrides?: Partial<{
  Sender: { Address: string };
  Subject: string;
  RawTextBody: string;
  RawHtmlBody: string;
  To: { Address: string }[];
  MessageId: string;
}>) {
  return {
    Sender: { Address: 'guest@example.com' },
    Subject: 'Question about check-in',
    RawTextBody: 'Hello, I have a question.',
    RawHtmlBody: null,
    To: [{ Address: 'hotel@lymon.co' }],
    MessageId: 'brevo-inbound-001',
    ...overrides,
  };
}

describe('CommunicationWebhookController', () => {
  let controller: CommunicationWebhookController;
  let commandBus: jest.Mocked<Pick<CommandBus, 'execute'>>;
  let verifier: { verify: jest.Mock };

  async function buildModule(inboundEnabled: boolean): Promise<void> {
    commandBus = { execute: jest.fn().mockResolvedValue(undefined) };
    verifier = { verify: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommunicationWebhookController],
      providers: [
        {
          provide: CommandBus,
          useValue: commandBus,
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'EMAIL_INBOUND_ENABLED') {
                return inboundEnabled ? 'true' : 'false';
              }
              return undefined;
            },
          },
        },
        {
          provide: EMAIL_WEBHOOK_VERIFIER,
          useValue: verifier,
        },
      ],
    }).compile();

    controller = module.get<CommunicationWebhookController>(CommunicationWebhookController);
  }

  beforeEach(async () => {
    await buildModule(true);
    jest.clearAllMocks();
  });

  // ─── /events (delivery status webhook) ────────────────────────────────────

  describe('POST /events (receiveDeliveryEvent)', () => {
    it('dispatches UpdateMessageDeliveryStatusCommand and returns processed:true when signature is valid and event is known', async () => {
      // Arrange
      verifier.verify.mockReturnValue(true);
      const payload = makeDeliveryPayload('delivered', 'brevo-msg-001');

      // Act
      const result = await controller.receiveDeliveryEvent(RAW_BODY, payload, VALID_SIGNATURE);

      // Assert
      expect(result).toEqual({ accepted: true, processed: true });
      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      expect(commandBus.execute).toHaveBeenCalledWith(
        new UpdateMessageDeliveryStatusCommand('brevo-msg-001', DeliveryStatusEvent.DELIVERED),
      );
    });

    it('maps soft_bounce Brevo event to BOUNCED DeliveryStatusEvent', async () => {
      // Arrange
      verifier.verify.mockReturnValue(true);
      const payload = makeDeliveryPayload('soft_bounce', 'brevo-msg-002');

      // Act
      const result = await controller.receiveDeliveryEvent(RAW_BODY, payload, VALID_SIGNATURE);

      // Assert
      expect(result).toEqual({ accepted: true, processed: true });
      expect(commandBus.execute).toHaveBeenCalledWith(
        new UpdateMessageDeliveryStatusCommand('brevo-msg-002', DeliveryStatusEvent.BOUNCED),
      );
    });

    it('maps hard_bounce Brevo event to BOUNCED DeliveryStatusEvent', async () => {
      // Arrange
      verifier.verify.mockReturnValue(true);
      const payload = makeDeliveryPayload('hard_bounce', 'brevo-msg-003');

      // Act
      const result = await controller.receiveDeliveryEvent(RAW_BODY, payload, VALID_SIGNATURE);

      // Assert
      expect(result).toEqual({ accepted: true, processed: true });
      expect(commandBus.execute).toHaveBeenCalledWith(
        new UpdateMessageDeliveryStatusCommand('brevo-msg-003', DeliveryStatusEvent.BOUNCED),
      );
    });

    it('maps opened Brevo event to READ DeliveryStatusEvent', async () => {
      // Arrange
      verifier.verify.mockReturnValue(true);
      const payload = makeDeliveryPayload('opened', 'brevo-msg-004');

      // Act
      const result = await controller.receiveDeliveryEvent(RAW_BODY, payload, VALID_SIGNATURE);

      // Assert
      expect(result).toEqual({ accepted: true, processed: true });
      expect(commandBus.execute).toHaveBeenCalledWith(
        new UpdateMessageDeliveryStatusCommand('brevo-msg-004', DeliveryStatusEvent.READ),
      );
    });

    it('returns processed:false and does not dispatch command when signature is invalid', async () => {
      // Arrange
      verifier.verify.mockReturnValue(false);
      const payload = makeDeliveryPayload('delivered');

      // Act
      const result = await controller.receiveDeliveryEvent(RAW_BODY, payload, 'bad-sig');

      // Assert
      expect(result).toEqual({ accepted: true, processed: false });
      expect(commandBus.execute).not.toHaveBeenCalled();
    });

    it('returns processed:false and does not dispatch command when event type is unknown', async () => {
      // Arrange
      verifier.verify.mockReturnValue(true);
      const payload = makeDeliveryPayload('unsubscribed', 'brevo-msg-005');

      // Act
      const result = await controller.receiveDeliveryEvent(RAW_BODY, payload, VALID_SIGNATURE);

      // Assert
      expect(result).toEqual({ accepted: true, processed: false });
      expect(commandBus.execute).not.toHaveBeenCalled();
    });

    it('returns processed:false when message-id is missing from the payload', async () => {
      // Arrange
      verifier.verify.mockReturnValue(true);
      const payload = { event: 'delivered', 'message-id': '' };

      // Act
      const result = await controller.receiveDeliveryEvent(
        RAW_BODY,
        payload as any,
        VALID_SIGNATURE,
      );

      // Assert
      expect(result).toEqual({ accepted: true, processed: false });
      expect(commandBus.execute).not.toHaveBeenCalled();
    });
  });

  // ─── /inbound ─────────────────────────────────────────────────────────────

  describe('POST /inbound (receiveInboundEmail) — EMAIL_INBOUND_ENABLED=false', () => {
    beforeEach(async () => {
      await buildModule(false);
      jest.clearAllMocks();
    });

    it('throws HttpException with status 501 when EMAIL_INBOUND_ENABLED is false', async () => {
      // Arrange
      verifier.verify.mockReturnValue(true);
      const payload = makeInboundPayload();

      // Act & Assert
      await expect(
        controller.receiveInboundEmail(RAW_BODY, payload as any, TENANT_ID, VALID_SIGNATURE),
      ).rejects.toThrow(HttpException);

      await expect(
        controller.receiveInboundEmail(RAW_BODY, payload as any, TENANT_ID, VALID_SIGNATURE),
      ).rejects.toMatchObject({ status: HttpStatus.NOT_IMPLEMENTED });
    });

    it('does not dispatch any command when EMAIL_INBOUND_ENABLED is false', async () => {
      // Arrange
      verifier.verify.mockReturnValue(true);
      const payload = makeInboundPayload();

      // Act
      await expect(
        controller.receiveInboundEmail(RAW_BODY, payload as any, TENANT_ID, VALID_SIGNATURE),
      ).rejects.toThrow(HttpException);

      // Assert
      expect(commandBus.execute).not.toHaveBeenCalled();
    });
  });

  describe('POST /inbound (receiveInboundEmail) — EMAIL_INBOUND_ENABLED=true', () => {
    it('dispatches RecordInboundMessageCommand and returns processed:true when signature is valid and sender is known', async () => {
      // Arrange
      verifier.verify.mockReturnValue(true);
      const payload = makeInboundPayload();

      // Act
      const result = await controller.receiveInboundEmail(
        RAW_BODY,
        payload as any,
        TENANT_ID,
        VALID_SIGNATURE,
      );

      // Assert
      expect(result).toEqual({ accepted: true, processed: true });
      expect(commandBus.execute).toHaveBeenCalledTimes(1);
      expect(commandBus.execute).toHaveBeenCalledWith(
        new RecordInboundMessageCommand(
          TENANT_ID,
          'guest@example.com',
          'Question about check-in',
          'Hello, I have a question.',
          null,
          ['hotel@lymon.co'],
          'brevo-inbound-001',
          'brevo',
        ),
      );
    });

    it('returns processed:false and does not dispatch command when signature is invalid', async () => {
      // Arrange
      verifier.verify.mockReturnValue(false);
      const payload = makeInboundPayload();

      // Act
      const result = await controller.receiveInboundEmail(
        RAW_BODY,
        payload as any,
        TENANT_ID,
        'bad-sig',
      );

      // Assert
      expect(result).toEqual({ accepted: true, processed: false });
      expect(commandBus.execute).not.toHaveBeenCalled();
    });

    it('returns processed:false when sender address is missing from payload', async () => {
      // Arrange
      verifier.verify.mockReturnValue(true);
      const payload = makeInboundPayload({ Sender: { Address: '' } });

      // Act
      const result = await controller.receiveInboundEmail(
        RAW_BODY,
        payload as any,
        TENANT_ID,
        VALID_SIGNATURE,
      );

      // Assert
      expect(result).toEqual({ accepted: true, processed: false });
      expect(commandBus.execute).not.toHaveBeenCalled();
    });

    it('returns processed:false when tenantId query param is missing', async () => {
      // Arrange
      verifier.verify.mockReturnValue(true);
      const payload = makeInboundPayload();

      // Act
      const result = await controller.receiveInboundEmail(
        RAW_BODY,
        payload as any,
        '',
        VALID_SIGNATURE,
      );

      // Assert
      expect(result).toEqual({ accepted: true, processed: false });
      expect(commandBus.execute).not.toHaveBeenCalled();
    });

    it('returns processed:false when RecordInboundMessageCommand throws DomainException (unknown sender)', async () => {
      // Arrange
      verifier.verify.mockReturnValue(true);
      commandBus.execute.mockRejectedValue(
        new DomainException('No guest found for email guest@example.com'),
      );
      const payload = makeInboundPayload();

      // Act
      const result = await controller.receiveInboundEmail(
        RAW_BODY,
        payload as any,
        TENANT_ID,
        VALID_SIGNATURE,
      );

      // Assert
      expect(result).toEqual({ accepted: true, processed: false });
    });

    it('re-throws non-DomainException errors from the command bus', async () => {
      // Arrange
      verifier.verify.mockReturnValue(true);
      commandBus.execute.mockRejectedValue(new Error('Unexpected internal failure'));
      const payload = makeInboundPayload();

      // Act & Assert
      await expect(
        controller.receiveInboundEmail(RAW_BODY, payload as any, TENANT_ID, VALID_SIGNATURE),
      ).rejects.toThrow('Unexpected internal failure');
    });

    it('maps multiple To addresses from the payload into the command', async () => {
      // Arrange
      verifier.verify.mockReturnValue(true);
      const payload = makeInboundPayload({
        To: [{ Address: 'hotel@lymon.co' }, { Address: 'support@lymon.co' }],
      });

      // Act
      await controller.receiveInboundEmail(RAW_BODY, payload as any, TENANT_ID, VALID_SIGNATURE);

      // Assert
      const dispatchedCommand: RecordInboundMessageCommand =
        (commandBus.execute as jest.Mock).mock.calls[0][0];
      expect(dispatchedCommand.to).toEqual(['hotel@lymon.co', 'support@lymon.co']);
    });

    it('passes null MessageId to command when payload MessageId is absent', async () => {
      // Arrange
      verifier.verify.mockReturnValue(true);
      const payload = makeInboundPayload({ MessageId: undefined });

      // Act
      await controller.receiveInboundEmail(RAW_BODY, payload as any, TENANT_ID, VALID_SIGNATURE);

      // Assert
      const dispatchedCommand: RecordInboundMessageCommand =
        (commandBus.execute as jest.Mock).mock.calls[0][0];
      expect(dispatchedCommand.providerMessageId).toBeNull();
    });
  });
});
