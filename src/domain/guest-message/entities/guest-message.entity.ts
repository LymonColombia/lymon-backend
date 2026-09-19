import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { IGuestMessageData } from '../interfaces/guest-message.interface';
import { GuestMessageChannel } from '../value-objects/guest-message-channel.vo';
import { GuestMessageDirection } from '../value-objects/guest-message-direction.vo';
import { GuestMessageId } from '../value-objects/guest-message-id.vo';
import { GuestMessageStatus } from '../value-objects/guest-message-status.vo';
import { CreateGuestMessageParams, GuestMessageAttachment, GuestMessageSentBy } from './guest-message.types';

export class GuestMessage {
  private constructor(
    private readonly id: GuestMessageId,
    private readonly tenantId: TenantId,
    private readonly guestId: GuestId,
    private readonly channel: GuestMessageChannel,
    private readonly direction: GuestMessageDirection,
    private status: GuestMessageStatus,
    private readonly from: string,
    private readonly to: string[],
    private readonly reservationId: string | null,
    private readonly provider: string | null,
    private providerMessageId: string | null,
    private readonly templateId: string | null,
    private readonly sentBy: GuestMessageSentBy,
    private readonly attachments: GuestMessageAttachment[],
    private readonly preview: string,
    private readonly body: string | null,
    private readonly bodyHtml: string | null,
    private failureReason: string | null,
    private readonly createdAt: Date,
    private updatedAt: Date,
    private readonly deletedAt: Date | null,
    private conversationId: string | null,
  ) {}

  static create(params: CreateGuestMessageParams): GuestMessage {
    const now = new Date();
    return new GuestMessage(
      GuestMessageId.create(),
      params.tenantId,
      params.guestId,
      params.channel,
      params.direction,
      params.status,
      params.from,
      params.to,
      params.reservationId ?? null,
      params.provider ?? null,
      params.providerMessageId ?? null,
      params.templateId ?? null,
      params.sentBy,
      params.attachments ?? [],
      params.preview,
      params.body ?? null,
      params.bodyHtml ?? null,
      params.failureReason ?? null,
      now,
      now,
      null,
      params.conversationId ?? null,
    );
  }

  static reconstitute(data: IGuestMessageData): GuestMessage {
    return new GuestMessage(
      data.id,
      data.tenantId,
      data.guestId,
      data.channel,
      data.direction,
      data.status,
      data.from,
      data.to,
      data.reservationId,
      data.provider,
      data.providerMessageId,
      data.templateId,
      data.sentBy,
      data.attachments,
      data.preview,
      data.body,
      data.bodyHtml,
      data.failureReason,
      data.createdAt,
      data.updatedAt,
      data.deletedAt,
      data.conversationId,
    );
  }

  getId(): GuestMessageId { return this.id; }
  getTenantId(): TenantId { return this.tenantId; }
  getGuestId(): GuestId { return this.guestId; }
  getChannel(): GuestMessageChannel { return this.channel; }
  getDirection(): GuestMessageDirection { return this.direction; }
  getStatus(): GuestMessageStatus { return this.status; }
  getFrom(): string { return this.from; }
  getTo(): string[] { return [...this.to]; }
  getReservationId(): string | null { return this.reservationId; }
  getProvider(): string | null { return this.provider; }
  getProviderMessageId(): string | null { return this.providerMessageId; }
  getTemplateId(): string | null { return this.templateId; }
  getSentBy(): GuestMessageSentBy { return this.sentBy; }
  getAttachments(): GuestMessageAttachment[] { return [...this.attachments]; }
  getPreview(): string { return this.preview; }
  getBody(): string | null { return this.body; }
  getBodyHtml(): string | null { return this.bodyHtml; }
  getFailureReason(): string | null { return this.failureReason; }
  getCreatedAt(): Date { return this.createdAt; }
  getUpdatedAt(): Date { return this.updatedAt; }
  getDeletedAt(): Date | null { return this.deletedAt; }
  getConversationId(): string | null { return this.conversationId; }

  assignConversation(id: string): void {
    this.conversationId = id;
    this.updatedAt = new Date();
  }

  updateStatus(status: GuestMessageStatus): void {
    this.status = status;
    this.updatedAt = new Date();
  }

  updateProviderMessageId(providerMessageId: string): void {
    this.providerMessageId = providerMessageId;
    this.updatedAt = new Date();
  }

  markFailed(reason: string): void {
    this.status = GuestMessageStatus.FAILED;
    this.failureReason = reason;
    this.updatedAt = new Date();
  }

  markDelivered(): void {
    this.status = GuestMessageStatus.DELIVERED;
    this.updatedAt = new Date();
  }

  markBounced(): void {
    this.status = GuestMessageStatus.BOUNCED;
    this.updatedAt = new Date();
  }

  markRead(): void {
    this.status = GuestMessageStatus.READ;
    this.updatedAt = new Date();
  }
}
