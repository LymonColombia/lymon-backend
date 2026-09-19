import { GuestNoteId } from '@/domain/guest-note/value-objects/guest-note-id.vo';
import { GuestNoteTypeEnum } from '@/domain/guest-note/value-objects/guest-node-type.vo';
import { GuestNoteStatusEnum } from '@/domain/guest-note/value-objects/guest-node-status.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';

export interface IGuestNoteData {
  id: GuestNoteId;
  tenantId: TenantId;
  guestId: GuestId;
  note: string;
  type: GuestNoteTypeEnum;
  status: GuestNoteStatusEnum;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
