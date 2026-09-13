import { Injectable } from '@nestjs/common';
import {
  GuestTag,
  PLATFORM_TENANT_ID,
} from '@/domain/guest-tag/entities/guest-tag.entity';
import type { GuestTagRepository } from '@/domain/guest-tag/repositories/guest-tag.repository';
import { GuestTagId } from '@/domain/guest-tag/value-objects/guest-tag-id.vo';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import { type guest_tags as GuestTagRow } from '@/infrastructure/persistence/prisma/generated/client';

/**
 * The domain marks platform-wide tags with the sentinel tenant '__platform__', which is
 * not a uuid and has no tenants row. The column is nullable and NULL carries the same
 * meaning, so the sentinel is translated on the way in and out.
 */
const toColumn = (tenantId: string): string | null =>
  tenantId === PLATFORM_TENANT_ID ? null : tenantId;

@Injectable()
export class PrismaGuestTagRepository implements GuestTagRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(tag: GuestTag): Promise<void> {
    await this.prisma.guest_tags.create({
      data: {
        tenant_id: toColumn(tag.getTenantId()),
        name: tag.getName(),
        created_at: tag.getCreatedAt(),
      },
    });
  }

  async findAll(tenantId: string): Promise<GuestTag[]> {
    const rows = await this.prisma.guest_tags.findMany({
      where: { OR: [{ tenant_id: tenantId }, { tenant_id: null }] },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findByNames(names: string[], tenantId: string): Promise<GuestTag[]> {
    const rows = await this.prisma.guest_tags.findMany({
      where: {
        OR: [{ tenant_id: tenantId }, { tenant_id: null }],
        name: { in: names.map((name) => name.trim().toLowerCase()) },
      },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async existsByTenantIdAndName(
    tenantId: string,
    name: string,
  ): Promise<boolean> {
    const row = await this.prisma.guest_tags.findFirst({
      where: { tenant_id: toColumn(tenantId), name },
      select: { id: true },
    });
    return row !== null;
  }

  private toDomain(row: GuestTagRow): GuestTag {
    return GuestTag.reconstitute(
      GuestTagId.createFromString(row.id),
      row.tenant_id ?? PLATFORM_TENANT_ID,
      row.name,
      row.created_at,
    );
  }
}
