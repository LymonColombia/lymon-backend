import { GetGuestNotesByGuestIdHandler } from '@/application/guest-note/queries/get-guest-notes-by-guest-id/get-guest-notes-by-guest-id.handler';
import { GetGuestNotesByGuestIdQuery } from '@/application/guest-note/queries/get-guest-notes-by-guest-id/get-guest-notes-by-guest-id.query';
import { GuestNote } from '@/domain/guest-note/entities/guest-note.entity';
import { GuestNoteRepository } from '@/domain/guest-note/repositories/guest-note.repository';
import { GuestNoteStatusEnum } from '@/domain/guest-note/value-objects/guest-node-status.vo';
import { GuestNoteTypeEnum } from '@/domain/guest-note/value-objects/guest-node-type.vo';
import { GuestNoteId } from '@/domain/guest-note/value-objects/guest-note-id.vo';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

function createGuestNoteRepositoryMock(): jest.Mocked<GuestNoteRepository> {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findByGuestId: jest.fn(),
    findByGuestIdPaginated: jest.fn(),
    delete: jest.fn(),
  };
}

describe('GetGuestNotesByGuestIdHandler', () => {
  let handler: GetGuestNotesByGuestIdHandler;
  let guestNoteRepository: jest.Mocked<GuestNoteRepository>;

  const tenantId = '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000';
  const guestId = '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000';

  beforeEach(() => {
    guestNoteRepository = createGuestNoteRepositoryMock();
    handler = new GetGuestNotesByGuestIdHandler(guestNoteRepository);
  });

  function makeGuestNote(
    overrides?: Partial<{
      id: string;
      tenantId: string;
      guestId: string;
      note: string;
      type: GuestNoteTypeEnum;
      status: GuestNoteStatusEnum;
      createdBy: string;
      createdAt: Date;
      updatedAt: Date;
    }>,
  ): GuestNote {
    return GuestNote.reconstitute({
      id: GuestNoteId.createFromString(overrides?.id ?? 'note-123'),
      tenantId: TenantId.createFromString(overrides?.tenantId ?? tenantId),
      guestId: GuestId.createFromString(overrides?.guestId ?? guestId),
      note: overrides?.note ?? 'Prefers a quiet room',
      type: overrides?.type ?? GuestNoteTypeEnum.PREFERENCE,
      status: overrides?.status ?? GuestNoteStatusEnum.NOT_PINNED,
      createdBy: overrides?.createdBy ?? 'user-123',
      createdAt: overrides?.createdAt ?? new Date('2030-01-01T10:00:00Z'),
      updatedAt: overrides?.updatedAt ?? new Date('2030-01-01T10:00:00Z'),
      deletedAt: null,
    });
  }

  describe('when guest notes exist', () => {
    it('returns notes mapped to DTOs', async () => {
      const note = makeGuestNote({
        id: 'note-abc',
        note: 'VIP guest',
        type: GuestNoteTypeEnum.GENERAL,
        status: GuestNoteStatusEnum.IS_PINNED,
        createdBy: 'staff-001',
      });
      guestNoteRepository.findByGuestIdPaginated.mockResolvedValue({
        notes: [note],
        total: 1,
      });

      const query = new GetGuestNotesByGuestIdQuery(tenantId, guestId);
      const result = await handler.execute(query);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toMatchObject({
        id: 'note-abc',
        guestId,
        note: 'VIP guest',
        type: GuestNoteTypeEnum.GENERAL,
        status: GuestNoteStatusEnum.IS_PINNED,
        createdBy: 'staff-001',
      });
      expect(result.total).toBe(1);
      expect(guestNoteRepository.findByGuestIdPaginated).toHaveBeenCalledWith(
        expect.objectContaining({ toString: expect.any(Function) }),
        expect.objectContaining({ toString: expect.any(Function) }),
        1,
        10,
      );
    });
  });

  describe('when the guest id format is invalid', () => {
    it('returns an empty list and does not query the repository', async () => {
      const query = new GetGuestNotesByGuestIdQuery(
        tenantId,
        'invalid-guest-id',
      );
      const result = await handler.execute(query);

      expect(result.items).toEqual([]);
      expect(guestNoteRepository.findByGuestIdPaginated).not.toHaveBeenCalled();
    });
  });

  describe('when there are no guest notes', () => {
    it('returns an empty list', async () => {
      guestNoteRepository.findByGuestIdPaginated.mockResolvedValue({
        notes: [],
        total: 0,
      });

      const query = new GetGuestNotesByGuestIdQuery(tenantId, guestId);
      const result = await handler.execute(query);

      expect(result.items).toEqual([]);
    });
  });
});
