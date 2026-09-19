jest.mock('uuid', () => ({ v4: () => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }));

import { EventEmitter2 } from '@nestjs/event-emitter';
import { GuestMessageRepository } from '@/domain/guest-message/repositories/guest-message.repository';
import { GuestMessageStatus } from '@/domain/guest-message/value-objects/guest-message-status.vo';
import { UpdateMessageDeliveryStatusHandler } from '@/application/guest-message/commands/update-message-delivery-status/update-message-delivery-status.handler';
import {
  DeliveryStatusEvent,
  UpdateMessageDeliveryStatusCommand,
} from '@/application/guest-message/commands/update-message-delivery-status/update-message-delivery-status.command';
import { createGuestMessageRepositoryMock } from '@test/shared/mocks/repositories/guest-message-repository.mock';
import { makeGuestMessage } from '@test/shared/fixtures/guest-message.fixture';

const PROVIDER_MESSAGE_ID = 'brevo-msg-abc-123';

function makeCommand(
  event: DeliveryStatusEvent,
  providerMessageId = PROVIDER_MESSAGE_ID,
): UpdateMessageDeliveryStatusCommand {
  return new UpdateMessageDeliveryStatusCommand(providerMessageId, event);
}

describe('UpdateMessageDeliveryStatusHandler', () => {
  let handler: UpdateMessageDeliveryStatusHandler;
  let guestMessageRepository: jest.Mocked<GuestMessageRepository>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(() => {
    guestMessageRepository = createGuestMessageRepositoryMock();
    eventEmitter = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

    handler = new UpdateMessageDeliveryStatusHandler(guestMessageRepository, eventEmitter);

    jest.clearAllMocks();
  });

  describe('Happy path — DELIVERED event', () => {
    it('calls markDelivered and saves the message when event is DELIVERED', async () => {
      // Arrange
      const message = makeGuestMessage({
        status: GuestMessageStatus.SENT,
        providerMessageId: PROVIDER_MESSAGE_ID,
      });
      guestMessageRepository.findByProviderMessageId.mockResolvedValue(message);
      guestMessageRepository.save.mockResolvedValue(undefined);

      const command = makeCommand(DeliveryStatusEvent.DELIVERED);

      // Act
      await handler.execute(command);

      // Assert
      expect(guestMessageRepository.findByProviderMessageId).toHaveBeenCalledWith(
        PROVIDER_MESSAGE_ID,
      );
      expect(message.getStatus()).toBe(GuestMessageStatus.DELIVERED);
      expect(guestMessageRepository.save).toHaveBeenCalledTimes(1);
      expect(guestMessageRepository.save).toHaveBeenCalledWith(message);
    });
  });

  describe('Happy path — BOUNCED event', () => {
    it('calls markBounced and saves the message when event is BOUNCED', async () => {
      // Arrange
      const message = makeGuestMessage({
        status: GuestMessageStatus.SENT,
        providerMessageId: PROVIDER_MESSAGE_ID,
      });
      guestMessageRepository.findByProviderMessageId.mockResolvedValue(message);
      guestMessageRepository.save.mockResolvedValue(undefined);

      const command = makeCommand(DeliveryStatusEvent.BOUNCED);

      // Act
      await handler.execute(command);

      // Assert
      expect(message.getStatus()).toBe(GuestMessageStatus.BOUNCED);
      expect(guestMessageRepository.save).toHaveBeenCalledTimes(1);
      expect(guestMessageRepository.save).toHaveBeenCalledWith(message);
    });
  });

  describe('Happy path — READ event', () => {
    it('calls markRead and saves the message when event is READ', async () => {
      // Arrange
      const message = makeGuestMessage({
        status: GuestMessageStatus.DELIVERED,
        providerMessageId: PROVIDER_MESSAGE_ID,
      });
      guestMessageRepository.findByProviderMessageId.mockResolvedValue(message);
      guestMessageRepository.save.mockResolvedValue(undefined);

      const command = makeCommand(DeliveryStatusEvent.READ);

      // Act
      await handler.execute(command);

      // Assert
      expect(message.getStatus()).toBe(GuestMessageStatus.READ);
      expect(guestMessageRepository.save).toHaveBeenCalledTimes(1);
      expect(guestMessageRepository.save).toHaveBeenCalledWith(message);
    });
  });

  describe('Idempotency — duplicate event', () => {
    it('returns without calling save when message is already at DELIVERED status and event is DELIVERED', async () => {
      // Arrange
      const message = makeGuestMessage({
        status: GuestMessageStatus.DELIVERED,
        providerMessageId: PROVIDER_MESSAGE_ID,
      });
      guestMessageRepository.findByProviderMessageId.mockResolvedValue(message);

      const command = makeCommand(DeliveryStatusEvent.DELIVERED);

      // Act
      await handler.execute(command);

      // Assert
      expect(guestMessageRepository.save).not.toHaveBeenCalled();
    });

    it('returns without calling save when message is already at BOUNCED status and event is BOUNCED', async () => {
      // Arrange
      const message = makeGuestMessage({
        status: GuestMessageStatus.BOUNCED,
        providerMessageId: PROVIDER_MESSAGE_ID,
      });
      guestMessageRepository.findByProviderMessageId.mockResolvedValue(message);

      const command = makeCommand(DeliveryStatusEvent.BOUNCED);

      // Act
      await handler.execute(command);

      // Assert
      expect(guestMessageRepository.save).not.toHaveBeenCalled();
    });

    it('returns without calling save when message is already at READ status and event is READ', async () => {
      // Arrange
      const message = makeGuestMessage({
        status: GuestMessageStatus.READ,
        providerMessageId: PROVIDER_MESSAGE_ID,
      });
      guestMessageRepository.findByProviderMessageId.mockResolvedValue(message);

      const command = makeCommand(DeliveryStatusEvent.READ);

      // Act
      await handler.execute(command);

      // Assert
      expect(guestMessageRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('Unknown providerMessageId — idempotent-safe', () => {
    it('returns without error and does not call save when providerMessageId is not found', async () => {
      // Arrange
      guestMessageRepository.findByProviderMessageId.mockResolvedValue(null);

      const command = makeCommand(DeliveryStatusEvent.DELIVERED, 'unknown-msg-id');

      // Act & Assert — must not throw
      await expect(handler.execute(command)).resolves.toBeUndefined();
      expect(guestMessageRepository.save).not.toHaveBeenCalled();
    });

    it('queries the repository with the exact providerMessageId from the command', async () => {
      // Arrange
      guestMessageRepository.findByProviderMessageId.mockResolvedValue(null);
      const unknownId = 'some-unknown-id';

      const command = makeCommand(DeliveryStatusEvent.READ, unknownId);

      // Act
      await handler.execute(command);

      // Assert
      expect(guestMessageRepository.findByProviderMessageId).toHaveBeenCalledWith(unknownId);
    });
  });

  describe('Error cases', () => {
    it('propagates unexpected repository errors from findByProviderMessageId', async () => {
      // Arrange
      guestMessageRepository.findByProviderMessageId.mockRejectedValue(
        new Error('DB connection lost'),
      );

      const command = makeCommand(DeliveryStatusEvent.DELIVERED);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('DB connection lost');
      expect(guestMessageRepository.save).not.toHaveBeenCalled();
    });

    it('propagates unexpected repository errors from save', async () => {
      // Arrange
      const message = makeGuestMessage({
        status: GuestMessageStatus.SENT,
        providerMessageId: PROVIDER_MESSAGE_ID,
      });
      guestMessageRepository.findByProviderMessageId.mockResolvedValue(message);
      guestMessageRepository.save.mockRejectedValue(new Error('Write failure'));

      const command = makeCommand(DeliveryStatusEvent.DELIVERED);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow('Write failure');
    });
  });
});
