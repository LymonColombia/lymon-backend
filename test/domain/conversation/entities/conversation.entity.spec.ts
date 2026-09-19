jest.mock('uuid', () => ({ v4: () => 'conv-uuid-aaaa-bbbb-cccc-ddddeeeeeeee' }));

import { Conversation } from '@/domain/conversation/entities/conversation.entity';
import { ConversationId } from '@/domain/conversation/value-objects/conversation-id.vo';
import { ConversationStatus } from '@/domain/conversation/value-objects/conversation-status.vo';
import { GuestMessageChannel } from '@/domain/guest-message/value-objects/guest-message-channel.vo';
import { GuestMessageDirection } from '@/domain/guest-message/value-objects/guest-message-direction.vo';
import {
  makeConversation,
  CONVERSATION_FIXTURE_DEFAULTS,
} from '@test/shared/fixtures/conversation.fixture';
import { makeGuestMessage } from '@test/shared/fixtures/guest-message.fixture';

describe('Conversation', () => {
  describe('create()', () => {
    it('creates an open conversation with empty channels, blank preview, and zero unread counts', () => {
      // Arrange
      const before = new Date();

      // Act
      const conversation = Conversation.create({
        tenantId: CONVERSATION_FIXTURE_DEFAULTS.tenantId,
        guestId: CONVERSATION_FIXTURE_DEFAULTS.guestId,
        subject: 'Welcome email',
      });

      const after = new Date();

      // Assert
      expect(conversation.getId()).toBeDefined();
      expect(conversation.getId().toString()).toBeTruthy();
      expect(conversation.getTenantId()).toBe(CONVERSATION_FIXTURE_DEFAULTS.tenantId);
      expect(conversation.getGuestId()).toBe(CONVERSATION_FIXTURE_DEFAULTS.guestId);
      expect(conversation.getReservationId()).toBeNull();
      expect(conversation.getChannels()).toEqual([]);
      expect(conversation.getSubject()).toBe('Welcome email');
      expect(conversation.getLastMessagePreview()).toBe('');
      expect(conversation.getUnreadCountForStaff()).toBe(0);
      expect(conversation.getUnreadCountForGuest()).toBe(0);
      expect(conversation.getStatus()).toBe(ConversationStatus.OPEN);
      expect(conversation.getCreatedAt().getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(conversation.getCreatedAt().getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('stores reservationId when provided', () => {
      // Arrange / Act
      const conversation = Conversation.create({
        tenantId: CONVERSATION_FIXTURE_DEFAULTS.tenantId,
        guestId: CONVERSATION_FIXTURE_DEFAULTS.guestId,
        subject: 'Subject',
        reservationId: 'res-001',
      });

      // Assert
      expect(conversation.getReservationId()).toBe('res-001');
    });

    it('sets reservationId to null when not provided', () => {
      // Arrange / Act
      const conversation = Conversation.create({
        tenantId: CONVERSATION_FIXTURE_DEFAULTS.tenantId,
        guestId: CONVERSATION_FIXTURE_DEFAULTS.guestId,
        subject: 'Subject',
      });

      // Assert
      expect(conversation.getReservationId()).toBeNull();
    });
  });

  describe('reconstitute()', () => {
    it('reconstitutes a conversation with all persisted fields', () => {
      // Arrange
      const id = ConversationId.createFromString(CONVERSATION_FIXTURE_DEFAULTS.id);
      const createdAt = new Date('2026-01-01T10:00:00Z');
      const updatedAt = new Date('2026-01-02T12:00:00Z');
      const lastMessageAt = new Date('2026-01-02T11:00:00Z');

      // Act
      const conversation = Conversation.reconstitute({
        id,
        tenantId: CONVERSATION_FIXTURE_DEFAULTS.tenantId,
        guestId: CONVERSATION_FIXTURE_DEFAULTS.guestId,
        reservationId: 'res-abc',
        channels: [GuestMessageChannel.EMAIL],
        subject: 'Check-in instructions',
        lastMessageAt,
        lastMessagePreview: 'Please arrive after 3pm',
        unreadCountForStaff: 2,
        unreadCountForGuest: 1,
        status: ConversationStatus.OPEN,
        createdAt,
        updatedAt,
      });

      // Assert
      expect(conversation.getId().toString()).toBe(CONVERSATION_FIXTURE_DEFAULTS.id);
      expect(conversation.getTenantId()).toBe(CONVERSATION_FIXTURE_DEFAULTS.tenantId);
      expect(conversation.getGuestId()).toBe(CONVERSATION_FIXTURE_DEFAULTS.guestId);
      expect(conversation.getReservationId()).toBe('res-abc');
      expect(conversation.getChannels()).toEqual([GuestMessageChannel.EMAIL]);
      expect(conversation.getSubject()).toBe('Check-in instructions');
      expect(conversation.getLastMessageAt()).toBe(lastMessageAt);
      expect(conversation.getLastMessagePreview()).toBe('Please arrive after 3pm');
      expect(conversation.getUnreadCountForStaff()).toBe(2);
      expect(conversation.getUnreadCountForGuest()).toBe(1);
      expect(conversation.getStatus()).toBe(ConversationStatus.OPEN);
      expect(conversation.getCreatedAt()).toBe(createdAt);
      expect(conversation.getUpdatedAt()).toBe(updatedAt);
    });
  });

  describe('appendMessage()', () => {
    it('increments unreadCountForStaff when the message is inbound', () => {
      // Arrange
      const conversation = makeConversation({ unreadCountForStaff: 0 });
      const message = makeGuestMessage({ direction: GuestMessageDirection.INBOUND });

      // Act
      conversation.appendMessage(message);

      // Assert
      expect(conversation.getUnreadCountForStaff()).toBe(1);
      expect(conversation.getUnreadCountForGuest()).toBe(0);
    });

    it('increments unreadCountForGuest when the message is outbound', () => {
      // Arrange
      const conversation = makeConversation({ unreadCountForGuest: 0 });
      const message = makeGuestMessage({ direction: GuestMessageDirection.OUTBOUND });

      // Act
      conversation.appendMessage(message);

      // Assert
      expect(conversation.getUnreadCountForGuest()).toBe(1);
      expect(conversation.getUnreadCountForStaff()).toBe(0);
    });

    it('adds the message channel when not already present', () => {
      // Arrange
      const conversation = makeConversation({ channels: [] });
      const message = makeGuestMessage({ channel: GuestMessageChannel.EMAIL });

      // Act
      conversation.appendMessage(message);

      // Assert
      expect(conversation.getChannels()).toContain(GuestMessageChannel.EMAIL);
      expect(conversation.getChannels()).toHaveLength(1);
    });

    it('does not duplicate the channel when the same channel is already in the list', () => {
      // Arrange
      const conversation = makeConversation({ channels: [GuestMessageChannel.EMAIL] });
      const message = makeGuestMessage({ channel: GuestMessageChannel.EMAIL });

      // Act
      conversation.appendMessage(message);

      // Assert
      expect(conversation.getChannels()).toHaveLength(1);
    });

    it('updates lastMessagePreview and lastMessageAt from the appended message', () => {
      // Arrange
      const conversation = makeConversation({ lastMessagePreview: 'old preview' });
      const message = makeGuestMessage({ preview: 'new preview from message' });

      // Act
      conversation.appendMessage(message);

      // Assert
      expect(conversation.getLastMessagePreview()).toBe('new preview from message');
      expect(conversation.getLastMessageAt()).toEqual(message.getCreatedAt());
    });

    it('refreshes updatedAt after appending a message', () => {
      // Arrange
      const conversation = makeConversation();
      const message = makeGuestMessage();
      const before = new Date();

      // Act
      conversation.appendMessage(message);

      // Assert
      expect(conversation.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('markReadByStaff()', () => {
    it('resets unreadCountForStaff to zero', () => {
      // Arrange
      const conversation = makeConversation({ unreadCountForStaff: 5 });

      // Act
      conversation.markReadByStaff();

      // Assert
      expect(conversation.getUnreadCountForStaff()).toBe(0);
    });

    it('does not modify unreadCountForGuest', () => {
      // Arrange
      const conversation = makeConversation({ unreadCountForStaff: 3, unreadCountForGuest: 2 });

      // Act
      conversation.markReadByStaff();

      // Assert
      expect(conversation.getUnreadCountForGuest()).toBe(2);
    });

    it('refreshes updatedAt', () => {
      // Arrange
      const conversation = makeConversation();
      const before = new Date();

      // Act
      conversation.markReadByStaff();

      // Assert
      expect(conversation.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('archive()', () => {
    it('sets status to ARCHIVED', () => {
      // Arrange
      const conversation = makeConversation({ status: ConversationStatus.OPEN });

      // Act
      conversation.archive();

      // Assert
      expect(conversation.getStatus()).toBe(ConversationStatus.ARCHIVED);
    });

    it('refreshes updatedAt', () => {
      // Arrange
      const conversation = makeConversation();
      const before = new Date();

      // Act
      conversation.archive();

      // Assert
      expect(conversation.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('snooze()', () => {
    it('sets status to SNOOZED', () => {
      // Arrange
      const conversation = makeConversation({ status: ConversationStatus.OPEN });

      // Act
      conversation.snooze();

      // Assert
      expect(conversation.getStatus()).toBe(ConversationStatus.SNOOZED);
    });
  });

  describe('reopen()', () => {
    it('sets status back to OPEN from ARCHIVED', () => {
      // Arrange
      const conversation = makeConversation({ status: ConversationStatus.ARCHIVED });

      // Act
      conversation.reopen();

      // Assert
      expect(conversation.getStatus()).toBe(ConversationStatus.OPEN);
    });

    it('sets status back to OPEN from SNOOZED', () => {
      // Arrange
      const conversation = makeConversation({ status: ConversationStatus.SNOOZED });

      // Act
      conversation.reopen();

      // Assert
      expect(conversation.getStatus()).toBe(ConversationStatus.OPEN);
    });
  });

  describe('getChannels()', () => {
    it('returns a copy of the channels array to prevent external mutation', () => {
      // Arrange
      const conversation = makeConversation({ channels: [GuestMessageChannel.EMAIL] });

      // Act
      const channels = conversation.getChannels();
      channels.push(GuestMessageChannel.EMAIL);

      // Assert
      expect(conversation.getChannels()).toHaveLength(1);
    });
  });
});
