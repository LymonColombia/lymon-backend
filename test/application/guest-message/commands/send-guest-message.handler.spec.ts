jest.mock('uuid', () => ({ v4: () => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }));

import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { SendGuestMessageHandler } from '@/application/guest-message/commands/send-guest-message/send-guest-message.handler';
import { SendGuestMessageCommand } from '@/application/guest-message/commands/send-guest-message/send-guest-message.command';
import { GUEST_MESSAGE_CREATED_EVENT } from '@/application/guest-message/events/guest-message-created.event';
import { AUDIT_LOG_EVENT } from '@/infrastructure/audit/events/audit-logged.event';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';
import { GuestRepository } from '@/domain/guest/repositories/guest.repository';
import { ReservationRepository } from '@/domain/reservation/repositories/reservation.repository';
import { PropertyRepository } from '@/domain/property/repositories/property.repository';
import { GuestMessageRepository } from '@/domain/guest-message/repositories/guest-message.repository';
import { ConversationRepository } from '@/domain/conversation/repositories/conversation.repository';
import { GuestMessageChannel } from '@/domain/guest-message/value-objects/guest-message-channel.vo';
import { GuestMessageDirection } from '@/domain/guest-message/value-objects/guest-message-direction.vo';
import { GuestMessageStatus } from '@/domain/guest-message/value-objects/guest-message-status.vo';
import { ConversationStatus } from '@/domain/conversation/value-objects/conversation-status.vo';
import { EmailTemplateService } from '@/infrastructure/common/email-template.service';
import { createGuestRepositoryMock } from '@test/shared/mocks/repositories/guest-repository.mock';
import { createReservationRepositoryMock } from '@test/shared/mocks/repositories/reservation-repository.mock';
import { createPropertyRepositoryMock } from '@test/shared/mocks/repositories/property-repository.mock';
import { createGuestMessageRepositoryMock } from '@test/shared/mocks/repositories/guest-message-repository.mock';
import { createConversationRepositoryMock } from '@test/shared/mocks/repositories/conversation-repository.mock';
import { makeGuest, GUEST_FIXTURE_DEFAULTS } from '@test/shared/fixtures/guest.fixture';
import { makeConversation, CONVERSATION_FIXTURE_DEFAULTS } from '@test/shared/fixtures/conversation.fixture';
import { makeReservation, RESERVATION_FIXTURE_DEFAULTS } from '@test/shared/fixtures/reservation.fixture';

const TENANT_ID = GUEST_FIXTURE_DEFAULTS.tenantId;
const GUEST_ID = GUEST_FIXTURE_DEFAULTS.id;
const ACTOR_ID = 'staff-actor-001';
const ACTOR_EMAIL = 'staff@hotel.com';

function makeCommand(
  subject = 'Subject',
  body?: string,
  templateId?: string,
): SendGuestMessageCommand {
  return new SendGuestMessageCommand(
    TENANT_ID,
    GUEST_ID,
    subject,
    body,
    templateId,
    [],
    ACTOR_ID,
    ACTOR_EMAIL,
  );
}

describe('SendGuestMessageHandler', () => {
  let handler: SendGuestMessageHandler;
  let guestRepository: jest.Mocked<GuestRepository>;
  let reservationRepository: jest.Mocked<ReservationRepository>;
  let propertyRepository: jest.Mocked<PropertyRepository>;
  let guestMessageRepository: jest.Mocked<GuestMessageRepository>;
  let conversationRepository: jest.Mocked<ConversationRepository>;
  let templateService: jest.Mocked<EmailTemplateService>;
  let eventEmitter: jest.Mocked<Pick<EventEmitter2, 'emit'>>;

  beforeEach(() => {
    guestRepository = createGuestRepositoryMock();
    reservationRepository = createReservationRepositoryMock();
    propertyRepository = createPropertyRepositoryMock();
    guestMessageRepository = createGuestMessageRepositoryMock();
    conversationRepository = createConversationRepositoryMock();
    templateService = {
      resolvePlaceholders: jest.fn((text: string) => text),
      renderTemplate: jest.fn(() => '<p>Rendered HTML</p>'),
    } as unknown as jest.Mocked<EmailTemplateService>;
    eventEmitter = { emit: jest.fn() };

    handler = new SendGuestMessageHandler(
      guestRepository,
      reservationRepository,
      propertyRepository,
      guestMessageRepository,
      conversationRepository,
      templateService,
      eventEmitter as unknown as EventEmitter2,
    );

    jest.clearAllMocks();

    guestRepository.findById.mockResolvedValue(makeGuest({ id: GUEST_ID, tenantId: TENANT_ID }));
    reservationRepository.findByGuestId.mockResolvedValue([]);
    guestMessageRepository.save.mockResolvedValue(undefined);
    conversationRepository.findByTenantAndGuest.mockResolvedValue(null);
    conversationRepository.save.mockResolvedValue(undefined);
  });

  describe('Happy path', () => {
    it('saves the message with PENDING/OUTBOUND status and emits guest-message.created and audit events', async () => {
      // Arrange
      const command = makeCommand('Test Subject', 'Hello, this is the message body');

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result.id).toBeTruthy();
      expect(guestMessageRepository.save).toHaveBeenCalled();

      const firstSaveCall = guestMessageRepository.save.mock.calls[0][0];
      expect(firstSaveCall.getChannel()).toBe(GuestMessageChannel.EMAIL);
      expect(firstSaveCall.getDirection()).toBe(GuestMessageDirection.OUTBOUND);
      expect(firstSaveCall.getStatus()).toBe(GuestMessageStatus.PENDING);
      expect(firstSaveCall.getBody()).toBeNull();
      expect(firstSaveCall.getBodyHtml()).toBeNull();
      expect(firstSaveCall.getTo()).toEqual([GUEST_FIXTURE_DEFAULTS.primaryEmail]);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        GUEST_MESSAGE_CREATED_EVENT,
        expect.objectContaining({
          guestMessageId: result.id,
          to: [GUEST_FIXTURE_DEFAULTS.primaryEmail],
        }),
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        AUDIT_LOG_EVENT,
        expect.objectContaining({
          tenantId: TENANT_ID,
          userId: ACTOR_ID,
          userEmail: ACTOR_EMAIL,
          action: AuditAction.GUEST_MESSAGE_SENT,
          entityType: AuditEntityType.GUEST_EMAIL,
        }),
      );
    });

    it('creates a new conversation when none exists for the tenant+guest pair', async () => {
      // Arrange
      conversationRepository.findByTenantAndGuest.mockResolvedValue(null);
      const command = makeCommand('New conv subject', 'Hello');

      // Act
      await handler.execute(command);

      // Assert
      expect(conversationRepository.findByTenantAndGuest).toHaveBeenCalledWith(TENANT_ID, GUEST_ID);
      expect(conversationRepository.save).toHaveBeenCalledTimes(1);
      const savedConversation = conversationRepository.save.mock.calls[0][0];
      expect(savedConversation.getTenantId()).toBe(TENANT_ID);
      expect(savedConversation.getGuestId()).toBe(GUEST_ID);
      expect(savedConversation.getStatus()).toBe(ConversationStatus.OPEN);
    });

    it('reuses an existing conversation when one already exists for the tenant+guest pair', async () => {
      // Arrange
      const existingConversation = makeConversation({
        tenantId: TENANT_ID,
        guestId: GUEST_ID,
        unreadCountForGuest: 0,
      });
      conversationRepository.findByTenantAndGuest.mockResolvedValue(existingConversation);
      const command = makeCommand('Follow-up', 'Second message');

      // Act
      await handler.execute(command);

      // Assert
      expect(conversationRepository.save).toHaveBeenCalledTimes(1);
      const savedConversation = conversationRepository.save.mock.calls[0][0];
      expect(savedConversation.getId().toString()).toBe(CONVERSATION_FIXTURE_DEFAULTS.id);
    });

    it('assigns the conversation id back to the guest message after the conversation is saved', async () => {
      // Arrange
      const command = makeCommand('Subject', 'body text');

      // Act
      await handler.execute(command);

      // Assert
      // guestMessageRepository.save is called twice: initial save + after assignConversation
      expect(guestMessageRepository.save).toHaveBeenCalledTimes(2);
      const secondSaveCall = guestMessageRepository.save.mock.calls[1][0];
      expect(secondSaveCall.getConversationId()).toBeTruthy();
    });

    it('stores preview as plain-text truncated to 200 chars', async () => {
      // Arrange
      const command = makeCommand('Subject', 'A'.repeat(300));

      // Act
      await handler.execute(command);

      // Assert
      const savedMessage = guestMessageRepository.save.mock.calls[0][0];
      expect(savedMessage.getPreview().length).toBeLessThanOrEqual(200);
      expect(savedMessage.getBody()).toBeNull();
      expect(savedMessage.getBodyHtml()).toBeNull();
    });

    it('uses templateId to render HTML when templateId is provided', async () => {
      // Arrange
      templateService.renderTemplate.mockReturnValue('<p>Template rendered</p>');
      const command = makeCommand('Welcome', 'Welcome body text', 'GUEST_WELCOME');

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(templateService.renderTemplate).toHaveBeenCalledWith(
        'guest-message',
        expect.objectContaining({ body: 'Welcome body text', subject: 'Welcome' }),
      );
      expect(result.id).toBeTruthy();

      const emittedEvent = (eventEmitter.emit as jest.Mock).mock.calls.find(
        ([event]) => event === GUEST_MESSAGE_CREATED_EVENT,
      );
      expect(emittedEvent).toBeDefined();
      expect(emittedEvent[1].htmlBody).toBe('<p>Template rendered</p>');
    });

    it('persists the reservationId of the guest last reservation on the saved message', async () => {
      const reservation = makeReservation({ guestId: GUEST_ID, tenantId: TENANT_ID });
      reservationRepository.findByGuestId.mockResolvedValue([reservation]);

      const command = makeCommand('Subject', 'Hello');
      await handler.execute(command);

      const savedMessage = guestMessageRepository.save.mock.calls[0][0];
      expect(savedMessage.getReservationId()).toBe(RESERVATION_FIXTURE_DEFAULTS.id);
    });

    it('persists reservationId as null when the guest has no reservations', async () => {
      reservationRepository.findByGuestId.mockResolvedValue([]);

      const command = makeCommand('Subject', 'Hello');
      await handler.execute(command);

      const savedMessage = guestMessageRepository.save.mock.calls[0][0];
      expect(savedMessage.getReservationId()).toBeNull();
    });

    it('stores the templateId on the saved guest message when templateId is provided', async () => {
      // Arrange
      templateService.renderTemplate.mockReturnValue('<p>HTML</p>');
      const command = makeCommand('Subject', 'body text', 'GUEST_WELCOME');

      // Act
      await handler.execute(command);

      // Assert
      const savedMessage = guestMessageRepository.save.mock.calls[0][0];
      expect(savedMessage.getTemplateId()).toBe('GUEST_WELCOME');
    });
  });

  describe('Error cases', () => {
    it('throws BadRequestException when neither body nor templateId is provided', async () => {
      // Arrange
      const command = makeCommand();

      // Act / Assert
      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow(
        'Debe proporcionar un mensaje de texto libre o un ID de plantilla',
      );
      expect(guestRepository.findById).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when guest is not found', async () => {
      // Arrange
      guestRepository.findById.mockResolvedValue(null);

      // Act / Assert
      await expect(handler.execute(makeCommand('Subject', 'Hello'))).rejects.toThrow(NotFoundException);
      await expect(handler.execute(makeCommand('Subject', 'Hello'))).rejects.toThrow('Huésped no encontrado');
    });

    it('throws NotFoundException when guest belongs to a different tenant', async () => {
      // Arrange
      guestRepository.findById.mockResolvedValue(
        makeGuest({ id: GUEST_ID, tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9ff00000000' }),
      );

      // Act / Assert
      await expect(handler.execute(makeCommand('Subject', 'Hello'))).rejects.toThrow(NotFoundException);
      await expect(handler.execute(makeCommand('Subject', 'Hello'))).rejects.toThrow('Huésped no encontrado');
    });

    it('does not emit events and does not save when guest is not found', async () => {
      // Arrange
      guestRepository.findById.mockResolvedValue(null);

      // Act / Assert
      await expect(handler.execute(makeCommand('Subject', 'Hello'))).rejects.toThrow(NotFoundException);

      expect(eventEmitter.emit).not.toHaveBeenCalled();
      expect(guestMessageRepository.save).not.toHaveBeenCalled();
      expect(conversationRepository.save).not.toHaveBeenCalled();
    });
  });
});
