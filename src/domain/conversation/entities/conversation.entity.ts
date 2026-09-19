import { GuestMessage } from '@/domain/guest-message/entities/guest-message.entity';
import { GuestMessageChannel } from '@/domain/guest-message/value-objects/guest-message-channel.vo';
import { GuestMessageDirection } from '@/domain/guest-message/value-objects/guest-message-direction.vo';
import { IConversationData } from '../interfaces/conversation.interface';
import { ConversationId } from '../value-objects/conversation-id.vo';
import { ConversationStatus } from '../value-objects/conversation-status.vo';

export interface CreateConversationParams {
  tenantId: string;
  guestId: string;
  reservationId?: string | null;
  subject: string;
}

export class Conversation {
  private constructor(
    private readonly id: ConversationId,
    private readonly tenantId: string,
    private readonly guestId: string,
    private readonly reservationId: string | null,
    private readonly channels: GuestMessageChannel[],
    private readonly subject: string,
    private lastMessageAt: Date,
    private lastMessagePreview: string,
    private unreadCountForStaff: number,
    private unreadCountForGuest: number,
    private status: ConversationStatus,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static create(params: CreateConversationParams): Conversation {
    const now = new Date();
    return new Conversation(
      ConversationId.create(),
      params.tenantId,
      params.guestId,
      params.reservationId ?? null,
      [],
      params.subject,
      now,
      '',
      0,
      0,
      ConversationStatus.OPEN,
      now,
      now,
    );
  }

  static reconstitute(data: IConversationData): Conversation {
    return new Conversation(
      data.id,
      data.tenantId,
      data.guestId,
      data.reservationId,
      [...data.channels],
      data.subject,
      data.lastMessageAt,
      data.lastMessagePreview,
      data.unreadCountForStaff,
      data.unreadCountForGuest,
      data.status,
      data.createdAt,
      data.updatedAt,
    );
  }

  appendMessage(message: GuestMessage): void {
    const channel = message.getChannel();
    if (!this.channels.includes(channel)) {
      this.channels.push(channel);
    }
    this.lastMessageAt = message.getCreatedAt();
    this.lastMessagePreview = message.getPreview();
    if (message.getDirection() === GuestMessageDirection.INBOUND) {
      this.unreadCountForStaff++;
    } else {
      this.unreadCountForGuest++;
    }
    this.touch();
  }

  markReadByStaff(): void {
    this.unreadCountForStaff = 0;
    this.touch();
  }

  archive(): void {
    this.status = ConversationStatus.ARCHIVED;
    this.touch();
  }

  snooze(): void {
    this.status = ConversationStatus.SNOOZED;
    this.touch();
  }

  reopen(): void {
    this.status = ConversationStatus.OPEN;
    this.touch();
  }

  private touch(): void {
    this.updatedAt = new Date();
  }

  getId(): ConversationId { return this.id; }
  getTenantId(): string { return this.tenantId; }
  getGuestId(): string { return this.guestId; }
  getReservationId(): string | null { return this.reservationId; }
  getChannels(): GuestMessageChannel[] { return [...this.channels]; }
  getSubject(): string { return this.subject; }
  getLastMessageAt(): Date { return this.lastMessageAt; }
  getLastMessagePreview(): string { return this.lastMessagePreview; }
  getUnreadCountForStaff(): number { return this.unreadCountForStaff; }
  getUnreadCountForGuest(): number { return this.unreadCountForGuest; }
  getStatus(): ConversationStatus { return this.status; }
  getCreatedAt(): Date { return this.createdAt; }
  getUpdatedAt(): Date { return this.updatedAt; }
}
