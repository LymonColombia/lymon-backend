import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetGuestNotesByGuestIdQuery } from './get-guest-notes-by-guest-id.query';
import {
  GetGuestNotesByGuestIdResult,
  GuestNoteDto,
} from './get-guest-notes-by-guest-id.result';
import {
  GUEST_NOTE_REPOSITORY,
  type GuestNoteRepository,
} from '@/domain/guest-note/repositories/guest-note.repository';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

@QueryHandler(GetGuestNotesByGuestIdQuery)
export class GetGuestNotesByGuestIdHandler implements IQueryHandler<
  GetGuestNotesByGuestIdQuery,
  GetGuestNotesByGuestIdResult
> {
  constructor(
    @Inject(GUEST_NOTE_REPOSITORY)
    private readonly guestNoteRepository: GuestNoteRepository,
  ) {}

  async execute(
    query: GetGuestNotesByGuestIdQuery,
  ): Promise<GetGuestNotesByGuestIdResult> {
    let guestId: GuestId;

    try {
      guestId = GuestId.createFromString(query.guestId);
    } catch {
      return new GetGuestNotesByGuestIdResult([], 0, query.page, query.limit);
    }

    const tenantId = TenantId.createFromString(query.tenantId);
    const { notes, total } =
      await this.guestNoteRepository.findByGuestIdPaginated(
        guestId,
        tenantId,
        query.page,
        query.limit,
      );

    const items: GuestNoteDto[] = notes.map((note) => ({
      id: note.getId()?.toString() ?? '',
      guestId: note.getGuestId().toString(),
      note: note.getNote(),
      type: note.getType(),
      status: note.getStatus(),
      createdBy: note.getCreatedBy(),
      createdAt: note.getCreatedAt(),
      updatedAt: note.getUpdatedAt(),
    }));

    return new GetGuestNotesByGuestIdResult(
      items,
      total,
      query.page,
      query.limit,
    );
  }
}
