import { GuestNote } from '@/domain/guest-note/entities/guest-note.entity';
import { GuestNoteId } from '@/domain/guest-note/value-objects/guest-note-id.vo';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

export const GUEST_NOTE_REPOSITORY = 'GUEST_NOTE_REPOSITORY';

export interface GuestNoteRepository {
  save(guestNote: GuestNote): Promise<void>;
  findById(id: GuestNoteId, tenantId: TenantId): Promise<GuestNote | null>;
  findByGuestId(guestId: GuestId, tenantId: TenantId): Promise<GuestNote[]>;
  findByGuestIdPaginated(
    guestId: GuestId,
    tenantId: TenantId,
    page: number,
    limit: number,
  ): Promise<{ notes: GuestNote[]; total: number }>;
  delete(id: GuestNoteId, tenantId: TenantId): Promise<void>;
}
