jest.mock('uuid', () => ({ v4: () => 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' }));

import { GuestMessage } from '@/domain/guest-message/entities/guest-message.entity';
import { GuestMessageChannel } from '@/domain/guest-message/value-objects/guest-message-channel.vo';
import { GuestMessageDirection } from '@/domain/guest-message/value-objects/guest-message-direction.vo';
import { GuestMessageStatus } from '@/domain/guest-message/value-objects/guest-message-status.vo';
import { GuestMessageId } from '@/domain/guest-message/value-objects/guest-message-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import {
  makeGuestMessage,
  GUEST_MESSAGE_FIXTURE_DEFAULTS,
} from '@test/shared/fixtures/guest-message.fixture';

describe('GuestMessage', () => {
  describe('create()', () => {
    it('creates a new guest message with generated id and current timestamps', () => {
      // Arrange
      const tenantId = TenantId.createFromString(GUEST_MESSAGE_FIXTURE_DEFAULTS.tenantId);
      const guestId = GuestId.createFromString(GUEST_MESSAGE_FIXTURE_DEFAULTS.guestId);
      const before = new Date();

      // Act
      const message = GuestMessage.create({
        tenantId,
        guestId,
        channel: GuestMessageChannel.EMAIL,
        direction: GuestMessageDirection.OUTBOUND,
        status: GuestMessageStatus.PENDING,
        from: 'sender@example.com',
        to: ['recipient@example.com'],
        sentBy: { actorId: 'actor-001', actorEmail: 'actor@example.com' },
        preview: 'Hello there',
      });

      const after = new Date();

      // Assert
      expect(message.getId()).toBeDefined();
      expect(message.getId().toString()).toBeTruthy();
      expect(message.getTenantId().toString()).toBe(GUEST_MESSAGE_FIXTURE_DEFAULTS.tenantId);
      expect(message.getGuestId().toString()).toBe(GUEST_MESSAGE_FIXTURE_DEFAULTS.guestId);
      expect(message.getChannel()).toBe(GuestMessageChannel.EMAIL);
      expect(message.getDirection()).toBe(GuestMessageDirection.OUTBOUND);
      expect(message.getStatus()).toBe(GuestMessageStatus.PENDING);
      expect(message.getFrom()).toBe('sender@example.com');
      expect(message.getTo()).toEqual(['recipient@example.com']);
      expect(message.getPreview()).toBe('Hello there');
      expect(message.getBody()).toBeNull();
      expect(message.getBodyHtml()).toBeNull();
      expect(message.getFailureReason()).toBeNull();
      expect(message.getProviderMessageId()).toBeNull();
      expect(message.getDeletedAt()).toBeNull();
      expect(message.getCreatedAt().getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(message.getCreatedAt().getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('sets optional fields to null when not provided', () => {
      // Arrange
      const tenantId = TenantId.createFromString(GUEST_MESSAGE_FIXTURE_DEFAULTS.tenantId);
      const guestId = GuestId.createFromString(GUEST_MESSAGE_FIXTURE_DEFAULTS.guestId);

      // Act
      const message = GuestMessage.create({
        tenantId,
        guestId,
        channel: GuestMessageChannel.EMAIL,
        direction: GuestMessageDirection.INBOUND,
        status: GuestMessageStatus.QUEUED,
        from: '',
        to: ['guest@example.com'],
        sentBy: { actorId: '', actorEmail: '' },
        preview: 'Inbound preview',
      });

      // Assert
      expect(message.getReservationId()).toBeNull();
      expect(message.getProvider()).toBeNull();
      expect(message.getProviderMessageId()).toBeNull();
      expect(message.getTemplateId()).toBeNull();
      expect(message.getAttachments()).toEqual([]);
      expect(message.getBody()).toBeNull();
      expect(message.getBodyHtml()).toBeNull();
      expect(message.getFailureReason()).toBeNull();
    });

    it('stores provided optional fields when given', () => {
      // Arrange
      const tenantId = TenantId.createFromString(GUEST_MESSAGE_FIXTURE_DEFAULTS.tenantId);
      const guestId = GuestId.createFromString(GUEST_MESSAGE_FIXTURE_DEFAULTS.guestId);

      // Act
      const message = GuestMessage.create({
        tenantId,
        guestId,
        channel: GuestMessageChannel.EMAIL,
        direction: GuestMessageDirection.OUTBOUND,
        status: GuestMessageStatus.PENDING,
        from: 'noreply@hotel.com',
        to: ['guest@example.com'],
        reservationId: 'res-001',
        provider: 'brevo',
        providerMessageId: 'brevo-msg-123',
        templateId: 'GUEST_WELCOME',
        sentBy: { actorId: 'staff-001', actorEmail: 'staff@hotel.com' },
        attachments: [{ url: 'https://example.com/file.pdf', name: 'Invoice' }],
        preview: 'Welcome to our property',
        body: 'Full body text',
        bodyHtml: '<p>Full body text</p>',
        failureReason: undefined,
      });

      // Assert
      expect(message.getReservationId()).toBe('res-001');
      expect(message.getProvider()).toBe('brevo');
      expect(message.getProviderMessageId()).toBe('brevo-msg-123');
      expect(message.getTemplateId()).toBe('GUEST_WELCOME');
      expect(message.getAttachments()).toEqual([
        { url: 'https://example.com/file.pdf', name: 'Invoice' },
      ]);
      expect(message.getBody()).toBe('Full body text');
      expect(message.getBodyHtml()).toBe('<p>Full body text</p>');
    });
  });

  describe('reconstitute()', () => {
    it('reconstitutes a guest message with all persisted fields', () => {
      // Arrange
      const id = GuestMessageId.createFromString(GUEST_MESSAGE_FIXTURE_DEFAULTS.id);
      const tenantId = TenantId.createFromString(GUEST_MESSAGE_FIXTURE_DEFAULTS.tenantId);
      const guestId = GuestId.createFromString(GUEST_MESSAGE_FIXTURE_DEFAULTS.guestId);
      const createdAt = new Date('2026-01-01T10:00:00Z');
      const updatedAt = new Date('2026-01-02T10:00:00Z');
      const deletedAt = new Date('2026-01-03T10:00:00Z');

      // Act
      const message = GuestMessage.reconstitute({
        id,
        tenantId,
        guestId,
        channel: GuestMessageChannel.EMAIL,
        direction: GuestMessageDirection.INBOUND,
        status: GuestMessageStatus.READ,
        from: 'guest@example.com',
        to: ['hotel@example.com'],
        reservationId: 'res-abc',
        provider: 'brevo',
        providerMessageId: 'msg-xyz',
        templateId: null,
        sentBy: { actorId: 'actor-1', actorEmail: 'actor@example.com' },
        attachments: [],
        preview: 'A preview text',
        body: 'Full body',
        bodyHtml: '<p>Full body</p>',
        failureReason: null,
        createdAt,
        updatedAt,
        deletedAt,
      });

      // Assert
      expect(message.getId().toString()).toBe(GUEST_MESSAGE_FIXTURE_DEFAULTS.id);
      expect(message.getTenantId().toString()).toBe(GUEST_MESSAGE_FIXTURE_DEFAULTS.tenantId);
      expect(message.getGuestId().toString()).toBe(GUEST_MESSAGE_FIXTURE_DEFAULTS.guestId);
      expect(message.getChannel()).toBe(GuestMessageChannel.EMAIL);
      expect(message.getDirection()).toBe(GuestMessageDirection.INBOUND);
      expect(message.getStatus()).toBe(GuestMessageStatus.READ);
      expect(message.getFrom()).toBe('guest@example.com');
      expect(message.getTo()).toEqual(['hotel@example.com']);
      expect(message.getReservationId()).toBe('res-abc');
      expect(message.getProvider()).toBe('brevo');
      expect(message.getProviderMessageId()).toBe('msg-xyz');
      expect(message.getTemplateId()).toBeNull();
      expect(message.getPreview()).toBe('A preview text');
      expect(message.getBody()).toBe('Full body');
      expect(message.getBodyHtml()).toBe('<p>Full body</p>');
      expect(message.getFailureReason()).toBeNull();
      expect(message.getCreatedAt()).toBe(createdAt);
      expect(message.getUpdatedAt()).toBe(updatedAt);
      expect(message.getDeletedAt()).toBe(deletedAt);
    });
  });

  describe('updateStatus()', () => {
    it('updates the status and refreshes updatedAt', () => {
      // Arrange
      const message = makeGuestMessage({ status: GuestMessageStatus.PENDING });
      const beforeUpdate = new Date();

      // Act
      message.updateStatus(GuestMessageStatus.SENT);

      // Assert
      expect(message.getStatus()).toBe(GuestMessageStatus.SENT);
      expect(message.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });

    it('transitions through multiple status values correctly', () => {
      // Arrange
      const message = makeGuestMessage({ status: GuestMessageStatus.SENT });

      // Act
      message.updateStatus(GuestMessageStatus.DELIVERED);

      // Assert
      expect(message.getStatus()).toBe(GuestMessageStatus.DELIVERED);

      // Act again
      message.updateStatus(GuestMessageStatus.READ);

      // Assert
      expect(message.getStatus()).toBe(GuestMessageStatus.READ);
    });
  });

  describe('updateProviderMessageId()', () => {
    it('sets providerMessageId and refreshes updatedAt', () => {
      // Arrange
      const message = makeGuestMessage({ providerMessageId: null });
      const beforeUpdate = new Date();

      // Act
      message.updateProviderMessageId('brevo-msg-456');

      // Assert
      expect(message.getProviderMessageId()).toBe('brevo-msg-456');
      expect(message.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });
  });

  describe('markFailed()', () => {
    it('sets status to FAILED, records failure reason, and refreshes updatedAt', () => {
      // Arrange
      const message = makeGuestMessage({ status: GuestMessageStatus.PENDING });
      const beforeUpdate = new Date();

      // Act
      message.markFailed('SMTP connection refused');

      // Assert
      expect(message.getStatus()).toBe(GuestMessageStatus.FAILED);
      expect(message.getFailureReason()).toBe('SMTP connection refused');
      expect(message.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });

    it('overwrites an existing failure reason when called again', () => {
      // Arrange
      const message = makeGuestMessage({
        status: GuestMessageStatus.FAILED,
        failureReason: 'first error',
      });

      // Act
      message.markFailed('second error');

      // Assert
      expect(message.getStatus()).toBe(GuestMessageStatus.FAILED);
      expect(message.getFailureReason()).toBe('second error');
    });
  });

  describe('getTo()', () => {
    it('returns a copy of the to array to prevent mutation', () => {
      // Arrange
      const message = makeGuestMessage({ to: ['a@example.com', 'b@example.com'] });

      // Act
      const toArray = message.getTo();
      toArray.push('mutated@example.com');

      // Assert
      expect(message.getTo()).toEqual(['a@example.com', 'b@example.com']);
    });
  });

  describe('getAttachments()', () => {
    it('returns a copy of the attachments array to prevent mutation', () => {
      // Arrange
      const attachment = { url: 'https://example.com/file.pdf', name: 'File' };
      const message = makeGuestMessage({ attachments: [attachment] });

      // Act
      const attachments = message.getAttachments();
      attachments.push({ url: 'https://evil.com/x.exe', name: 'Malicious' });

      // Assert
      expect(message.getAttachments()).toHaveLength(1);
    });
  });

  describe('markDelivered()', () => {
    it('sets status to DELIVERED and refreshes updatedAt', () => {
      // Arrange
      const message = makeGuestMessage({ status: GuestMessageStatus.SENT });
      const beforeUpdate = new Date();

      // Act
      message.markDelivered();

      // Assert
      expect(message.getStatus()).toBe(GuestMessageStatus.DELIVERED);
      expect(message.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });

    it('sets status to DELIVERED even when already in a different terminal-adjacent state', () => {
      // Arrange
      const message = makeGuestMessage({ status: GuestMessageStatus.PENDING });

      // Act
      message.markDelivered();

      // Assert
      expect(message.getStatus()).toBe(GuestMessageStatus.DELIVERED);
    });
  });

  describe('markBounced()', () => {
    it('sets status to BOUNCED and refreshes updatedAt', () => {
      // Arrange
      const message = makeGuestMessage({ status: GuestMessageStatus.SENT });
      const beforeUpdate = new Date();

      // Act
      message.markBounced();

      // Assert
      expect(message.getStatus()).toBe(GuestMessageStatus.BOUNCED);
      expect(message.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });

    it('sets status to BOUNCED from PENDING state', () => {
      // Arrange
      const message = makeGuestMessage({ status: GuestMessageStatus.PENDING });

      // Act
      message.markBounced();

      // Assert
      expect(message.getStatus()).toBe(GuestMessageStatus.BOUNCED);
    });
  });

  describe('markRead()', () => {
    it('sets status to READ and refreshes updatedAt', () => {
      // Arrange
      const message = makeGuestMessage({ status: GuestMessageStatus.DELIVERED });
      const beforeUpdate = new Date();

      // Act
      message.markRead();

      // Assert
      expect(message.getStatus()).toBe(GuestMessageStatus.READ);
      expect(message.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });

    it('sets status to READ even when called from SENT state', () => {
      // Arrange
      const message = makeGuestMessage({ status: GuestMessageStatus.SENT });

      // Act
      message.markRead();

      // Assert
      expect(message.getStatus()).toBe(GuestMessageStatus.READ);
    });
  });
});
