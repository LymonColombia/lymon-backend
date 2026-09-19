jest.mock('uuid', () => ({ v4: () => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }));

import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainException } from '@/domain/shared/exceptions/domain.exception';
import { GuestRepository } from '@/domain/guest/repositories/guest.repository';
import { GuestMessageRepository } from '@/domain/guest-message/repositories/guest-message.repository';
import { GuestMessageChannel } from '@/domain/guest-message/value-objects/guest-message-channel.vo';
import { GuestMessageDirection } from '@/domain/guest-message/value-objects/guest-message-direction.vo';
import { GuestMessageStatus } from '@/domain/guest-message/value-objects/guest-message-status.vo';
import {
  RecordInboundMessageHandler,
  GUEST_MESSAGE_RECEIVED_EVENT,
  GuestMessageReceivedEvent,
} from '@/application/guest-message/commands/record-inbound-message/record-inbound-message.handler';
import { RecordInboundMessageCommand } from '@/application/guest-message/commands/record-inbound-message/record-inbound-message.command';
import { createGuestRepositoryMock } from '@test/shared/mocks/repositories/guest-repository.mock';
import { createGuestMessageRepositoryMock } from '@test/shared/mocks/repositories/guest-message-repository.mock';
import { makeGuest, GUEST_FIXTURE_DEFAULTS } from '@test/shared/fixtures/guest.fixture';

const TENANT_ID = GUEST_FIXTURE_DEFAULTS.tenantId;
const SENDER_EMAIL = GUEST_FIXTURE_DEFAULTS.primaryEmail;
const PROVIDER_MESSAGE_ID = 'brevo-inbound-msg-001';

function makeCommand(
  overrides?: Partial<{
    senderEmail: string;
    body: string | null;
    bodyHtml: string | null;
    providerMessageId: string | null;
  }>,
): RecordInboundMessageCommand {
  return new RecordInboundMessageCommand(
    TENANT_ID,
    overrides?.senderEmail ?? SENDER_EMAIL,
    'Re: Your reservation',
    overrides?.body !== undefined ? overrides.body : 'Hello, I have a question.',
    overrides?.bodyHtml !== undefined ? overrides.bodyHtml : null,
    ['hotel@lymon.co'],
    overrides?.providerMessageId !== undefined ? overrides.providerMessageId : PROVIDER_MESSAGE_ID,
    'brevo',
  );
}

describe('RecordInboundMessageHandler', () => {
  let handler: RecordInboundMessageHandler;
  let guestRepository: jest.Mocked<GuestRepository>;
  let guestMessageRepository: jest.Mocked<GuestMessageRepository>;
  let eventEmitter: jest.Mocked<Pick<EventEmitter2, 'emit'>>;

  beforeEach(() => {
    guestRepository = createGuestRepositoryMock();
    guestMessageRepository = createGuestMessageRepositoryMock();
    eventEmitter = { emit: jest.fn() };

    handler = new RecordInboundMessageHandler(
      guestRepository,
      guestMessageRepository,
      eventEmitter as unknown as EventEmitter2,
    );

    jest.clearAllMocks();

    guestRepository.findByPrimaryEmail.mockResolvedValue(
      makeGuest({ id: GUEST_FIXTURE_DEFAULTS.id, tenantId: TENANT_ID }),
    );
    guestMessageRepository.save.mockResolvedValue(undefined);
  });

  describe('Happy path', () => {
    it('creates an INBOUND DELIVERED message and saves it when sender email is known', async () => {
      // Arrange
      const command = makeCommand();

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.id).toBeTruthy();
      expect(guestMessageRepository.save).toHaveBeenCalledTimes(1);

      const savedMessage = guestMessageRepository.save.mock.calls[0][0];
      expect(savedMessage.getChannel()).toBe(GuestMessageChannel.EMAIL);
      expect(savedMessage.getDirection()).toBe(GuestMessageDirection.INBOUND);
      expect(savedMessage.getStatus()).toBe(GuestMessageStatus.DELIVERED);
      expect(savedMessage.getFrom()).toBe(SENDER_EMAIL);
      expect(savedMessage.getTo()).toEqual(['hotel@lymon.co']);
    });

    it('stores the body taken directly from the command payload without external fetch', async () => {
      // Arrange
      const command = makeCommand({ body: 'Direct body from payload', bodyHtml: null });

      // Act
      await handler.execute(command);

      // Assert
      const savedMessage = guestMessageRepository.save.mock.calls[0][0];
      expect(savedMessage.getBody()).toBe('Direct body from payload');
      expect(savedMessage.getBodyHtml()).toBeNull();
    });

    it('stores bodyHtml from the command payload when provided', async () => {
      // Arrange
      const command = makeCommand({ body: null, bodyHtml: '<p>HTML body</p>' });

      // Act
      await handler.execute(command);

      // Assert
      const savedMessage = guestMessageRepository.save.mock.calls[0][0];
      expect(savedMessage.getBody()).toBeNull();
      expect(savedMessage.getBodyHtml()).toBe('<p>HTML body</p>');
    });

    it('stores providerMessageId on the saved message when provided', async () => {
      // Arrange
      const command = makeCommand({ providerMessageId: 'brevo-inbound-xyz' });

      // Act
      await handler.execute(command);

      // Assert
      const savedMessage = guestMessageRepository.save.mock.calls[0][0];
      expect(savedMessage.getProviderMessageId()).toBe('brevo-inbound-xyz');
    });

    it('stores null providerMessageId when not provided in command', async () => {
      // Arrange
      const command = makeCommand({ providerMessageId: null });

      // Act
      await handler.execute(command);

      // Assert
      const savedMessage = guestMessageRepository.save.mock.calls[0][0];
      expect(savedMessage.getProviderMessageId()).toBeNull();
    });

    it('emits GUEST_MESSAGE_RECEIVED_EVENT with correct guestMessageId, guestId and tenantId', async () => {
      // Arrange
      const command = makeCommand();

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        GUEST_MESSAGE_RECEIVED_EVENT,
        expect.any(GuestMessageReceivedEvent),
      );

      const emittedEvent: GuestMessageReceivedEvent = (eventEmitter.emit as jest.Mock).mock
        .calls[0][1];
      expect(emittedEvent.guestMessageId).toBe(result.id);
      expect(emittedEvent.guestId).toBe(GUEST_FIXTURE_DEFAULTS.id);
      expect(emittedEvent.tenantId).toBe(TENANT_ID);
    });

    it('generates a plain-text preview stripped of HTML tags, truncated to 200 characters', async () => {
      // Arrange
      const longHtml = '<p>' + 'A'.repeat(300) + '</p>';
      const command = makeCommand({ body: null, bodyHtml: longHtml });

      // Act
      await handler.execute(command);

      // Assert
      const savedMessage = guestMessageRepository.save.mock.calls[0][0];
      expect(savedMessage.getPreview().length).toBeLessThanOrEqual(200);
      expect(savedMessage.getPreview()).not.toContain('<p>');
    });

    it('looks up the guest using the sender email scoped to the correct tenantId', async () => {
      // Arrange
      const command = makeCommand();

      // Act
      await handler.execute(command);

      // Assert
      expect(guestRepository.findByPrimaryEmail).toHaveBeenCalledTimes(1);
      const [calledTenantId, calledEmail] =
        guestRepository.findByPrimaryEmail.mock.calls[0];
      expect(calledTenantId.toString()).toBe(TENANT_ID);
      expect(calledEmail).toBe(SENDER_EMAIL);
    });
  });

  describe('Error cases', () => {
    it('throws DomainException when sender email is not found among guests', async () => {
      // Arrange
      guestRepository.findByPrimaryEmail.mockResolvedValue(null);
      const command = makeCommand({ senderEmail: 'unknown@external.com' });

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(DomainException);
      await expect(handler.execute(command)).rejects.toThrow(
        'No guest found for email unknown@external.com',
      );
    });

    it('does not call guestMessageRepository.save when sender is unknown', async () => {
      // Arrange
      guestRepository.findByPrimaryEmail.mockResolvedValue(null);
      const command = makeCommand({ senderEmail: 'unknown@external.com' });

      // Act
      await expect(handler.execute(command)).rejects.toThrow(DomainException);

      // Assert
      expect(guestMessageRepository.save).not.toHaveBeenCalled();
    });

    it('does not emit GUEST_MESSAGE_RECEIVED_EVENT when sender is unknown', async () => {
      // Arrange
      guestRepository.findByPrimaryEmail.mockResolvedValue(null);
      const command = makeCommand({ senderEmail: 'unknown@external.com' });

      // Act
      await expect(handler.execute(command)).rejects.toThrow(DomainException);

      // Assert
      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it('propagates unexpected repository errors without swallowing them', async () => {
      // Arrange
      guestRepository.findByPrimaryEmail.mockRejectedValue(new Error('DB connection lost'));
      const command = makeCommand();

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('DB connection lost');
      expect(guestMessageRepository.save).not.toHaveBeenCalled();
    });
  });
});
