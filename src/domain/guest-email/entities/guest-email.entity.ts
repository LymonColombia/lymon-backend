import { GuestEmailId } from '../value-objects/guest-email-id.vo';
import { GuestEmailStatusEnum } from '../value-objects/guest-email-status.vo';
import {
  CreateGuestEmailParams,
  GuestEmailAttachment,
} from './guest-email.types';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { IGuestEmailData } from '../interfaces/guest-email.interface';

export class GuestEmail {
  private constructor(
    private readonly id: GuestEmailId,
    private readonly tenantId: TenantId,
    private readonly guestId: GuestId,
    private readonly subject: string,
    private status: GuestEmailStatusEnum,
    private readonly attachments: GuestEmailAttachment[],
    private messageId: string | null,
    private readonly sentById: string | null,
    private readonly createdAt: Date,
  ) {}

  static create(params: CreateGuestEmailParams): GuestEmail {
    if (!params.subject || params.subject.trim() === '') {
      throw new Error('GuestEmail subject is required');
    }

    return new GuestEmail(
      GuestEmailId.create(),
      params.tenantId,
      params.guestId,
      params.subject,
      params.status,
      params.attachments ?? [],
      params.messageId ?? null,
      params.sentById ?? null,
      new Date(),
    );
  }

  static reconstitute(data: IGuestEmailData): GuestEmail {
    return new GuestEmail(
      data.id,
      data.tenantId,
      data.guestId,
      data.subject,
      data.status,
      data.attachments,
      data.messageId,
      data.sentById,
      data.createdAt,
    );
  }

  // Getters
  getId(): GuestEmailId {
    return this.id;
  }
  getTenantId(): TenantId {
    return this.tenantId;
  }
  getGuestId(): GuestId {
    return this.guestId;
  }
  getSubject(): string {
    return this.subject;
  }
  getStatus(): GuestEmailStatusEnum {
    return this.status;
  }
  getAttachments(): GuestEmailAttachment[] {
    return [...this.attachments];
  }
  getMessageId(): string | null {
    return this.messageId;
  }
  getSentById(): string | null {
    return this.sentById;
  }
  getCreatedAt(): Date {
    return this.createdAt;
  }

  updateStatus(status: GuestEmailStatusEnum): void {
    this.status = status;
  }

  updateMessageId(messageId: string): void {
    this.messageId = messageId;
  }
}
