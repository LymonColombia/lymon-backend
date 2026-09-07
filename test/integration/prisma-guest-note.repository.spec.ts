import { PrismaGuestNoteRepository } from '@/infrastructure/persistence/repositories/prisma-guest-note.repository';
import { GuestNote } from '@/domain/guest-note/entities/guest-note.entity';
import { GuestNoteId } from '@/domain/guest-note/value-objects/guest-note-id.vo';
import { GuestNoteTypeEnum } from '@/domain/guest-note/value-objects/guest-node-type.vo';
import { GuestNoteStatusEnum } from '@/domain/guest-note/value-objects/guest-node-status.vo';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { prisma, resetDatabase } from './prisma.helper';
import { seedGuest, seedTenant, seedUser } from './fixtures';

describe('PrismaGuestNoteRepository', () => {
  const repo = new PrismaGuestNoteRepository(prisma);

  let tenantId: string;
  let guestId: string;
  let userId: string;

  beforeEach(async () => {
    await resetDatabase();
    tenantId = (await seedTenant()).id;
    guestId = (await seedGuest(tenantId)).id;
    userId = (await seedUser(tenantId)).id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const newNote = (text = 'Prefers a high floor') =>
    GuestNote.create({
      tenantId: TenantId.createFromString(tenantId),
      guestId: GuestId.createFromString(guestId),
      note: text,
      type: GuestNoteTypeEnum.PREFERENCE,
      createdBy: userId,
    });

  it('round-trips a note and defaults the status', async () => {
    await repo.save(newNote());

    const [note] = await repo.findByGuestId(
      GuestId.createFromString(guestId),
      TenantId.createFromString(tenantId),
    );
    expect(note.getNote()).toBe('Prefers a high floor');
    expect(note.getType()).toBe(GuestNoteTypeEnum.PREFERENCE);
    expect(note.getStatus()).toBe(GuestNoteStatusEnum.NOT_PINNED);
    expect(note.getCreatedBy()).toBe(userId);
  });

  it('updates in place instead of inserting again', async () => {
    await repo.save(newNote());
    const created = (await prisma.guest_notes.findFirst())!;

    const loaded = (await repo.findById(
      GuestNoteId.createFromString(created.id),
      TenantId.createFromString(tenantId),
    ))!;
    loaded.togglePin();
    await repo.save(loaded);

    expect(await prisma.guest_notes.count()).toBe(1);
    const reloaded = (await repo.findById(
      GuestNoteId.createFromString(created.id),
      TenantId.createFromString(tenantId),
    ))!;
    expect(reloaded.getStatus()).toBe(GuestNoteStatusEnum.IS_PINNED);
  });

  it('paginates newest first', async () => {
    for (const text of ['first', 'second', 'third']) {
      await repo.save(newNote(text));
    }

    const page = await repo.findByGuestIdPaginated(
      GuestId.createFromString(guestId),
      TenantId.createFromString(tenantId),
      1,
      2,
    );
    expect(page.total).toBe(3);
    expect(page.notes).toHaveLength(2);
  });

  it('scopes reads to the tenant and hides soft-deleted notes', async () => {
    await repo.save(newNote());
    const created = (await prisma.guest_notes.findFirst())!;
    const otherTenant = TenantId.createFromString((await seedTenant({ name: 'Andina' })).id);

    expect(
      await repo.findById(GuestNoteId.createFromString(created.id), otherTenant),
    ).toBeNull();

    await repo.delete(
      GuestNoteId.createFromString(created.id),
      TenantId.createFromString(tenantId),
    );

    expect(
      await repo.findById(
        GuestNoteId.createFromString(created.id),
        TenantId.createFromString(tenantId),
      ),
    ).toBeNull();
    expect(
      await repo.findByGuestId(
        GuestId.createFromString(guestId),
        TenantId.createFromString(tenantId),
      ),
    ).toEqual([]);
  });

  it('refuses to delete a note belonging to another tenant', async () => {
    await repo.save(newNote());
    const created = (await prisma.guest_notes.findFirst())!;
    const otherTenant = TenantId.createFromString((await seedTenant({ name: 'Andina' })).id);

    await repo.delete(GuestNoteId.createFromString(created.id), otherTenant);

    expect((await prisma.guest_notes.findUnique({ where: { id: created.id } }))!.deleted_at).toBeNull();
  });
});
