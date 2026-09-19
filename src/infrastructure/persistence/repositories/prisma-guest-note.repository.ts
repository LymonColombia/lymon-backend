import { Injectable } from '@nestjs/common';
import { GuestNote } from '@/domain/guest-note/entities/guest-note.entity';
import { GuestNoteRepository } from '@/domain/guest-note/repositories/guest-note.repository';
import { GuestNoteId } from '@/domain/guest-note/value-objects/guest-note-id.vo';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { GuestNoteTypeEnum } from '@/domain/guest-note/value-objects/guest-node-type.vo';
import { GuestNoteStatusEnum } from '@/domain/guest-note/value-objects/guest-node-status.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import { type guest_notes as GuestNoteRow } from '@/infrastructure/persistence/prisma/generated/client';

@Injectable()
export class PrismaGuestNoteRepository implements GuestNoteRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(note: GuestNote): Promise<void> {
    const id = note.getId()?.toString();

    const data = {
      note: note.getNote(),
      type: note.getType(),
      status: note.getStatus(),
      created_by: note.getCreatedBy(),
      updated_at: note.getUpdatedAt(),
      deleted_at: note.getDeletedAt(),
    };

    if (id) {
      await this.prisma.guest_notes.update({ where: { id }, data });
      return;
    }

    await this.prisma.guest_notes.create({
      data: {
        ...data,
        tenant_id: note.getTenantId().toString(),
        guest_id: note.getGuestId().toString(),
        created_at: note.getCreatedAt(),
      },
    });
  }

  async findById(id: GuestNoteId, tenantId: TenantId): Promise<GuestNote | null> {
    const row = await this.prisma.guest_notes.findFirst({
      where: {
        id: id.toString(),
        tenant_id: tenantId.toString(),
        deleted_at: null,
      },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByGuestId(guestId: GuestId, tenantId: TenantId): Promise<GuestNote[]> {
    const rows = await this.prisma.guest_notes.findMany({
      where: {
        guest_id: guestId.toString(),
        tenant_id: tenantId.toString(),
        deleted_at: null,
      },
      orderBy: { created_at: 'desc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findByGuestIdPaginated(
    guestId: GuestId,
    tenantId: TenantId,
    page: number,
    limit: number,
  ): Promise<{ notes: GuestNote[]; total: number }> {
    const where = {
      guest_id: guestId.toString(),
      tenant_id: tenantId.toString(),
      deleted_at: null,
    };

    const [total, rows] = await Promise.all([
      this.prisma.guest_notes.count({ where }),
      this.prisma.guest_notes.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { notes: rows.map((row) => this.toDomain(row)), total };
  }

  async delete(id: GuestNoteId, tenantId: TenantId): Promise<void> {
    await this.prisma.guest_notes.updateMany({
      where: { id: id.toString(), tenant_id: tenantId.toString() },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });
  }

  private toDomain(row: GuestNoteRow): GuestNote {
    return GuestNote.reconstitute({
      id: GuestNoteId.createFromString(row.id),
      tenantId: TenantId.createFromString(row.tenant_id),
      guestId: GuestId.createFromString(row.guest_id),
      note: row.note,
      type: row.type as GuestNoteTypeEnum,
      status: row.status as GuestNoteStatusEnum,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    });
  }
}
