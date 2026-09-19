import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { GuestNoteTypeEnum } from '@/domain/guest-note/value-objects/guest-node-type.vo';
import { GuestNoteStatusEnum } from '@/domain/guest-note/value-objects/guest-node-status.vo';

export interface CreateGuestNoteParams {
  tenantId: TenantId;
  guestId: GuestId;
  note: string;
  type: GuestNoteTypeEnum;
  status?: GuestNoteStatusEnum;
  createdBy: string;
}
