jest.mock('uuid', () => ({ v4: () => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }));

import { GuestMessageCreatedListener } from '@/infrastructure/email/listeners/guest-message-created.listener';
import { GuestMessageCreatedEvent } from '@/application/guest-message/events/guest-message-created.event';
import { IEmailService } from '@/application/shared/services/email.service';
import { GuestMessageRepository } from '@/domain/guest-message/repositories/guest-message.repository';
import { GuestMessageStatus } from '@/domain/guest-message/value-objects/guest-message-status.vo';
import { createGuestMessageRepositoryMock } from '@test/shared/mocks/repositories/guest-message-repository.mock';
import {
  makeGuestMessage,
  GUEST_MESSAGE_FIXTURE_DEFAULTS,
} from '@test/shared/fixtures/guest-message.fixture';

const MESSAGE_ID = GUEST_MESSAGE_FIXTURE_DEFAULTS.id;

function makeEvent(overrides?: Partial<GuestMessageCreatedEvent>): GuestMessageCreatedEvent {
  return new GuestMessageCreatedEvent(
    overrides?.guestMessageId ?? MESSAGE_ID,
    overrides?.subject ?? 'Test Subject',
    overrides?.htmlBody ?? '<p>Hello</p>',
    overrides?.to ?? ['guest@example.com'],
    overrides?.toNames ?? ['John Doe'],
    overrides?.attachments ?? [],
    overrides?.senderName ?? 'Hotel Property',
  );
}

describe('GuestMessageCreatedListener', () => {
  let listener: GuestMessageCreatedListener;
  let emailService: jest.Mocked<IEmailService>;
  let guestMessageRepository: jest.Mocked<GuestMessageRepository>;

  beforeEach(() => {
    emailService = {
      sendEmail: jest.fn(),
      sendVerificationEmail: jest.fn(),
      sendRecoveryEmail: jest.fn(),
      sendLowStockAlertEmail: jest.fn(),
    };
    guestMessageRepository = createGuestMessageRepositoryMock();

    listener = new GuestMessageCreatedListener(
      emailService,
      guestMessageRepository,
    );

    jest.clearAllMocks();
  });

  describe('Happy path', () => {
    it('sends email, updates message status to SENT and sets providerMessageId, then saves', async () => {
      // Arrange
      const message = makeGuestMessage({ status: GuestMessageStatus.PENDING });
      guestMessageRepository.findById.mockResolvedValue(message);
      emailService.sendEmail.mockResolvedValue({ messageId: 'brevo-msg-abc' });
      guestMessageRepository.save.mockResolvedValue(undefined);

      const event = makeEvent();

      // Act
      await listener.handleGuestMessageCreated(event);

      // Assert
      expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: [{ email: 'guest@example.com', name: 'John Doe' }],
          subject: 'Test Subject',
          htmlContent: '<p>Hello</p>',
          sender: { email: 'lymonoficial@outlook.com', name: 'Hotel Property' },
        }),
      );
      expect(message.getStatus()).toBe(GuestMessageStatus.SENT);
      expect(message.getProviderMessageId()).toBe('brevo-msg-abc');
      expect(guestMessageRepository.save).toHaveBeenCalledWith(message);
    });

    it('maps multiple recipients correctly when sending email', async () => {
      // Arrange
      const message = makeGuestMessage({ status: GuestMessageStatus.PENDING });
      guestMessageRepository.findById.mockResolvedValue(message);
      emailService.sendEmail.mockResolvedValue({ messageId: 'msg-multi' });
      guestMessageRepository.save.mockResolvedValue(undefined);

      const event = makeEvent({
        to: ['a@example.com', 'b@example.com'],
        toNames: ['Alice', 'Bob'],
      });

      // Act
      await listener.handleGuestMessageCreated(event);

      // Assert
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: [
            { email: 'a@example.com', name: 'Alice' },
            { email: 'b@example.com', name: 'Bob' },
          ],
        }),
      );
    });
  });

  describe('Early-return cases', () => {
    it('returns early without sending email when message is not found', async () => {
      // Arrange
      guestMessageRepository.findById.mockResolvedValue(null);

      const event = makeEvent();

      // Act
      await listener.handleGuestMessageCreated(event);

      // Assert
      expect(emailService.sendEmail).not.toHaveBeenCalled();
      expect(guestMessageRepository.save).not.toHaveBeenCalled();
    });

    it('returns early without sending email when message status is not PENDING', async () => {
      // Arrange
      const message = makeGuestMessage({ status: GuestMessageStatus.SENT });
      guestMessageRepository.findById.mockResolvedValue(message);

      const event = makeEvent();

      // Act
      await listener.handleGuestMessageCreated(event);

      // Assert
      expect(emailService.sendEmail).not.toHaveBeenCalled();
      expect(guestMessageRepository.save).not.toHaveBeenCalled();
    });

    it('returns early when message status is FAILED', async () => {
      // Arrange
      const message = makeGuestMessage({ status: GuestMessageStatus.FAILED });
      guestMessageRepository.findById.mockResolvedValue(message);

      const event = makeEvent();

      // Act
      await listener.handleGuestMessageCreated(event);

      // Assert
      expect(emailService.sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('Error path', () => {
    it('marks message as failed with the error message and saves when email sending throws', async () => {
      // Arrange
      const message = makeGuestMessage({ status: GuestMessageStatus.PENDING });
      guestMessageRepository.findById.mockResolvedValueOnce(message);
      emailService.sendEmail.mockRejectedValue(new Error('SMTP connection refused'));
      // Second findById is called in the catch block
      guestMessageRepository.findById.mockResolvedValueOnce(message);
      guestMessageRepository.save.mockResolvedValue(undefined);

      const event = makeEvent();

      // Act
      await listener.handleGuestMessageCreated(event);

      // Assert
      expect(message.getStatus()).toBe(GuestMessageStatus.FAILED);
      expect(message.getFailureReason()).toBe('SMTP connection refused');
      expect(guestMessageRepository.save).toHaveBeenCalledTimes(1);
    });

    it('marks message as failed with "Unknown error" when a non-Error is thrown', async () => {
      // Arrange
      const message = makeGuestMessage({ status: GuestMessageStatus.PENDING });
      guestMessageRepository.findById.mockResolvedValueOnce(message);
      emailService.sendEmail.mockRejectedValue('raw string error');
      guestMessageRepository.findById.mockResolvedValueOnce(message);
      guestMessageRepository.save.mockResolvedValue(undefined);

      const event = makeEvent();

      // Act
      await listener.handleGuestMessageCreated(event);

      // Assert
      expect(message.getStatus()).toBe(GuestMessageStatus.FAILED);
      expect(message.getFailureReason()).toBe('Unknown error');
    });

    it('does not throw when cleanup findById returns null during error handling', async () => {
      // Arrange
      const message = makeGuestMessage({ status: GuestMessageStatus.PENDING });
      guestMessageRepository.findById.mockResolvedValueOnce(message);
      emailService.sendEmail.mockRejectedValue(new Error('Network failure'));
      guestMessageRepository.findById.mockResolvedValueOnce(null);

      const event = makeEvent();

      // Act & Assert — should not throw
      await expect(listener.handleGuestMessageCreated(event)).resolves.toBeUndefined();
      expect(guestMessageRepository.save).not.toHaveBeenCalled();
    });
  });
});
