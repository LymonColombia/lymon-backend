jest.mock('uuid', () => ({ v4: () => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }));

import { NotFoundException } from '@nestjs/common';
import { GetGuestMessageByIdHandler } from '@/application/guest-message/queries/get-guest-message-by-id/get-guest-message-by-id.handler';
import { GetGuestMessageByIdQuery } from '@/application/guest-message/queries/get-guest-message-by-id/get-guest-message-by-id.query';
import { IMessageBodyProvider } from '@/application/shared/services/message-body-provider.service';
import { GuestMessageRepository } from '@/domain/guest-message/repositories/guest-message.repository';
import { GuestMessageStatus } from '@/domain/guest-message/value-objects/guest-message-status.vo';
import { createGuestMessageRepositoryMock } from '@test/shared/mocks/repositories/guest-message-repository.mock';
import { createMessageBodyProviderMock } from '@test/shared/mocks/services/message-body-provider.mock';
import {
  makeGuestMessage,
  GUEST_MESSAGE_FIXTURE_DEFAULTS,
} from '@test/shared/fixtures/guest-message.fixture';

const TENANT_ID = GUEST_MESSAGE_FIXTURE_DEFAULTS.tenantId;
const GUEST_ID = GUEST_MESSAGE_FIXTURE_DEFAULTS.guestId;
const MESSAGE_ID = GUEST_MESSAGE_FIXTURE_DEFAULTS.id;

describe('GetGuestMessageByIdHandler', () => {
  let handler: GetGuestMessageByIdHandler;
  let guestMessageRepository: jest.Mocked<GuestMessageRepository>;
  let messageBodyProvider: jest.Mocked<IMessageBodyProvider>;

  beforeEach(() => {
    guestMessageRepository = createGuestMessageRepositoryMock();
    messageBodyProvider = createMessageBodyProviderMock();

    handler = new GetGuestMessageByIdHandler(
      guestMessageRepository,
      messageBodyProvider,
    );

    jest.clearAllMocks();
  });

  describe('Happy path', () => {
    it('returns full body from provider when providerMessageId is set and provider returns content', async () => {
      // Arrange
      const message = makeGuestMessage({
        providerMessageId: 'brevo-msg-123',
        preview: 'Short preview',
        status: GuestMessageStatus.SENT,
      });
      guestMessageRepository.findById.mockResolvedValue(message);
      messageBodyProvider.getBody.mockResolvedValue('Full email body from provider');

      const query = new GetGuestMessageByIdQuery(TENANT_ID, GUEST_ID, MESSAGE_ID);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(messageBodyProvider.getBody).toHaveBeenCalledWith('brevo-msg-123');
      expect(result.body).toBe('Full email body from provider');
      expect(result.id).toBe(MESSAGE_ID);
      expect(result.preview).toBe('Short preview');
      expect(result.providerMessageId).toBe('brevo-msg-123');
    });

    it('falls back to preview when providerMessageId is set but provider returns null', async () => {
      // Arrange
      const message = makeGuestMessage({
        providerMessageId: 'brevo-msg-999',
        preview: 'Fallback preview text',
        status: GuestMessageStatus.SENT,
      });
      guestMessageRepository.findById.mockResolvedValue(message);
      messageBodyProvider.getBody.mockResolvedValue(null);

      const query = new GetGuestMessageByIdQuery(TENANT_ID, GUEST_ID, MESSAGE_ID);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(messageBodyProvider.getBody).toHaveBeenCalledWith('brevo-msg-999');
      expect(result.body).toBe('Fallback preview text');
    });

    it('falls back to preview without calling provider when providerMessageId is null', async () => {
      // Arrange
      const message = makeGuestMessage({
        providerMessageId: null,
        preview: 'Preview only message',
        status: GuestMessageStatus.PENDING,
      });
      guestMessageRepository.findById.mockResolvedValue(message);

      const query = new GetGuestMessageByIdQuery(TENANT_ID, GUEST_ID, MESSAGE_ID);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(messageBodyProvider.getBody).not.toHaveBeenCalled();
      expect(result.body).toBe('Preview only message');
    });

    it('maps all message fields into the result DTO correctly', async () => {
      // Arrange
      const message = makeGuestMessage({
        providerMessageId: null,
        status: GuestMessageStatus.DELIVERED,
      });
      guestMessageRepository.findById.mockResolvedValue(message);

      const query = new GetGuestMessageByIdQuery(TENANT_ID, GUEST_ID, MESSAGE_ID);

      // Act
      const result = await handler.execute(query);

      // Assert
      expect(result.id).toBe(MESSAGE_ID);
      expect(result.guestId).toBe(GUEST_ID);
      expect(result.channel).toBe(GUEST_MESSAGE_FIXTURE_DEFAULTS.channel);
      expect(result.direction).toBe(GUEST_MESSAGE_FIXTURE_DEFAULTS.direction);
      expect(result.status).toBe(GuestMessageStatus.DELIVERED);
      expect(result.sentBy).toEqual(GUEST_MESSAGE_FIXTURE_DEFAULTS.sentBy);
      expect(result.attachments).toEqual([]);
      expect(result.createdAt).toEqual(GUEST_MESSAGE_FIXTURE_DEFAULTS.createdAt);
    });
  });

  describe('Error cases', () => {
    it('throws NotFoundException when message is not found in repository', async () => {
      // Arrange
      guestMessageRepository.findById.mockResolvedValue(null);

      const query = new GetGuestMessageByIdQuery(TENANT_ID, GUEST_ID, MESSAGE_ID);

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(query)).rejects.toThrow('Mensaje no encontrado');
    });

    it('throws NotFoundException when message belongs to a different tenant', async () => {
      // Arrange
      const differentTenantId = '65f1a1a2-b3c4-d5e6-f7a8-b9ff00000000';
      const message = makeGuestMessage({ tenantId: TENANT_ID });
      guestMessageRepository.findById.mockResolvedValue(message);

      const query = new GetGuestMessageByIdQuery(differentTenantId, GUEST_ID, MESSAGE_ID);

      // Act & Assert
      await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(query)).rejects.toThrow('Mensaje no encontrado');
    });

    it('does not call messageBodyProvider when message is not found', async () => {
      // Arrange
      guestMessageRepository.findById.mockResolvedValue(null);

      const query = new GetGuestMessageByIdQuery(TENANT_ID, GUEST_ID, MESSAGE_ID);

      // Act
      await expect(handler.execute(query)).rejects.toThrow(NotFoundException);

      // Assert
      expect(messageBodyProvider.getBody).not.toHaveBeenCalled();
    });
  });
});
