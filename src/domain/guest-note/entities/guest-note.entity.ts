import { GuestNoteId } from '@/domain/guest-note/value-objects/guest-note-id.vo';
import { GuestNoteTypeEnum } from '@/domain/guest-note/value-objects/guest-node-type.vo';
import { GuestNoteStatusEnum } from '@/domain/guest-note/value-objects/guest-node-status.vo';
import { CreateGuestNoteParams } from './guest-note.types';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { IGuestNoteData } from '../interfaces/guest-note.interface';

export class GuestNote {
  private constructor(
    private readonly id: GuestNoteId | null,
    private readonly tenantId: TenantId,
    private readonly guestId: GuestId,
    private note: string,
    private type: GuestNoteTypeEnum,
    private status: GuestNoteStatusEnum,
    private readonly createdBy: string,
    private readonly createdAt: Date,
    private updatedAt: Date,
    private deletedAt: Date | null,
  ) {}

  static create(params: CreateGuestNoteParams): GuestNote {
    const noteContent = params.note?.trim();
    if (!noteContent) {
      throw new Error('GuestNote content is required');
    }

    return new GuestNote(
      null,
      params.tenantId,
      params.guestId,
      noteContent,
      params.type,
      params.status ?? GuestNoteStatusEnum.NOT_PINNED,
      params.createdBy,
      new Date(),
      new Date(),
      null,
    );
  }

  static reconstitute(data: IGuestNoteData): GuestNote {
    return new GuestNote(
      data.id,
      data.tenantId,
      data.guestId,
      data.note,
      data.type,
      data.status,
      data.createdBy,
      data.createdAt,
      data.updatedAt,
      data.deletedAt,
    );
  }

  // Getters
  getId(): GuestNoteId | null {
    return this.id;
  }

  getTenantId(): TenantId {
    return this.tenantId;
  }

  getGuestId(): GuestId {
    return this.guestId;
  }

  getNote(): string {
    return this.note;
  }

  getType(): GuestNoteTypeEnum {
    return this.type;
  }

  getStatus(): GuestNoteStatusEnum {
    return this.status;
  }

  getCreatedBy(): string {
    return this.createdBy;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  getDeletedAt(): Date | null {
    return this.deletedAt;
  }

  updateContent(note: string): void {
    const normalized = note.trim();
    if (!normalized) {
      throw new Error('GuestNote content cannot be empty');
    }
    this.note = normalized;
    this.touch();
  }

  changeType(type: GuestNoteTypeEnum): void {
    this.type = type;
    this.touch();
  }

  archive(): void {
    this.status = GuestNoteStatusEnum.NOT_PINNED;
    this.touch();
  }

  togglePin(): void {
    this.status =
      this.status === GuestNoteStatusEnum.IS_PINNED
        ? GuestNoteStatusEnum.NOT_PINNED
        : GuestNoteStatusEnum.IS_PINNED;
    this.touch();
  }

  softDelete(): void {
    this.deletedAt = new Date();
    this.touch();
  }

  private touch(): void {
    this.updatedAt = new Date();
  }
}
