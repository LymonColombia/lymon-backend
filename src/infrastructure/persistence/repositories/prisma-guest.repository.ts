import { Injectable } from '@nestjs/common';
import { Guest } from '@/domain/guest/entities/guest.entity';
import { GuestRepository } from '@/domain/guest/repositories/guest.repository';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { GuestPreferenceItem } from '@/domain/guest/value-objects/guest-preference-item.vo';
import { GuestStatusEnum } from '@/domain/guest/entities/guest.types';
import { GuestPreferenceCategoryEnum } from '@/domain/guest-preference/value-objects/guest-preference-category.vo';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import {
  GuestTag,
  PLATFORM_TENANT_ID,
} from '@/domain/guest-tag/entities/guest-tag.entity';
import { GuestTagId } from '@/domain/guest-tag/value-objects/guest-tag-id.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { TransactionContextData } from '@/domain/shared/transaction-manager.interface';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import {
  Prisma,
  type guests as GuestRow,
  type guest_tags as GuestTagRow,
} from '@/infrastructure/persistence/prisma/generated/client';

type GuestRowWithTags = GuestRow & {
  guest_tag_assignments: { guest_tags: GuestTagRow }[];
};

const WITH_TAGS = {
  guest_tag_assignments: { include: { guest_tags: true } },
} as const;

@Injectable()
export class PrismaGuestRepository implements GuestRepository {
  constructor(private readonly prisma: PrismaService) {}

  private client(context?: TransactionContextData) {
    return (context as Prisma.TransactionClient | undefined) ?? this.prisma;
  }

  async save(
    guest: Guest,
    transactionContext?: TransactionContextData,
  ): Promise<string> {
    const db = this.client(transactionContext);
    const id = guest.getId()?.toString();
    const identity = guest.getIdentity();
    const summary = guest.getSummary();

    const data = {
      guest_account_id: guest.getGuestAccountId()?.toString() ?? null,
      document_type: identity?.documentType ?? null,
      document_number: identity?.documentNumber ?? null,
      country_code: identity?.countryCode ?? null,
      first_name: guest.getFirstName(),
      last_name: guest.getLastName(),
      full_name: guest.getFullName(),
      primary_email: guest.getPrimaryEmail(),
      phone: guest.getPhone(),
      status: guest.getStatus(),
      preferences: guest.getPreferences() as unknown as Prisma.InputJsonValue,
      total_bookings: summary.totalBookings,
      total_nights: summary.totalNights,
      total_spend: summary.totalSpend,
      last_stay_at: summary.lastStayAt,
      last_property_id: summary.lastPropertyId?.toString() ?? null,
      last_unit_id: summary.lastUnitId?.toString() ?? null,
      pending_email: guest.getPendingEmail(),
      email_change_token: guest.getEmailChangeToken(),
      email_change_expiry: guest.getEmailChangeExpiry(),
      updated_at: guest.getUpdatedAt(),
    };

    const tagIds = guest
      .getTags()
      .map((tag) => tag.getId()?.toString())
      .filter((tagId): tagId is string => Boolean(tagId));

    if (id) {
      await db.guests.update({ where: { id }, data });
      await this.replaceTags(db, id, tagIds);
      return id;
    }

    const created = await db.guests.create({
      data: {
        ...data,
        tenant_id: guest.getTenantId().toString(),
        created_at: guest.getCreatedAt(),
      },
    });
    await this.replaceTags(db, created.id, tagIds);
    return created.id;
  }

  /** The embedded tag id array becomes rows in the guest_tag_assignments join table. */
  private async replaceTags(
    db: Prisma.TransactionClient | PrismaService,
    guestId: string,
    tagIds: string[],
  ): Promise<void> {
    await db.guest_tag_assignments.deleteMany({ where: { guest_id: guestId } });
    if (tagIds.length === 0) return;

    await db.guest_tag_assignments.createMany({
      data: tagIds.map((tagId) => ({ guest_id: guestId, guest_tag_id: tagId })),
    });
  }

  async findById(id: GuestId): Promise<Guest | null> {
    return this.findOne({ id: id.toString() });
  }

  async findByTenantId(tenantId: TenantId): Promise<Guest[]> {
    return this.findMany({ tenant_id: tenantId.toString() });
  }

  async findByPrimaryEmail(
    tenantId: TenantId,
    primaryEmail: string,
  ): Promise<Guest | null> {
    // primary_email is citext, so the lowercasing the mongo version did is redundant
    return this.findOne({
      tenant_id: tenantId.toString(),
      primary_email: primaryEmail.trim(),
    });
  }

  async findByDocumentNumber(
    tenantId: TenantId,
    documentNumber: string,
  ): Promise<Guest | null> {
    return this.findOne({
      tenant_id: tenantId.toString(),
      document_number: documentNumber.trim(),
    });
  }

  async findByGuestAccountId(
    tenantId: TenantId,
    guestAccountId: GuestAccountId,
  ): Promise<Guest | null> {
    return this.findOne({
      tenant_id: tenantId.toString(),
      guest_account_id: guestAccountId.toString(),
    });
  }

  async findAllByGuestAccountId(
    guestAccountId: GuestAccountId,
  ): Promise<Guest[]> {
    return this.findMany({ guest_account_id: guestAccountId.toString() });
  }

  async findByEmailChangeToken(hashedToken: string): Promise<Guest | null> {
    return this.findOne({ email_change_token: hashedToken });
  }

  async countByTenantId(tenantId: TenantId): Promise<number> {
    return this.prisma.guests.count({
      where: { tenant_id: tenantId.toString() },
    });
  }

  async delete(id: GuestId): Promise<void> {
    await this.prisma.guests.delete({ where: { id: id.toString() } });
  }

  async findByTenantIdPaginated(
    tenantId: TenantId,
    page: number,
    limit: number,
    sortBy: 'createdAt' | 'fullName' | 'status',
    sortDirection: 'asc' | 'desc',
  ): Promise<{ guests: Guest[]; total: number }> {
    const column = {
      createdAt: 'created_at',
      fullName: 'full_name',
      status: 'status',
    }[sortBy];

    return this.paginate({ tenant_id: tenantId.toString() }, page, limit, {
      [column]: sortDirection,
    });
  }

  async search(tenantId: TenantId, term: string): Promise<Guest[]> {
    return this.findMany(this.searchWhere(tenantId, term));
  }

  async searchPaginated(
    tenantId: TenantId,
    term: string,
    page: number,
    limit: number,
  ): Promise<{ guests: Guest[]; total: number }> {
    return this.paginate(this.searchWhere(tenantId, term), page, limit, {
      created_at: 'desc',
    });
  }

  /**
   * Literal substring match across the searchable columns. The mongo version built a
   * RegExp and had to escape the term first; `contains` needs no escaping.
   */
  private searchWhere(tenantId: TenantId, term: string): Prisma.guestsWhereInput {
    const contains = { contains: term, mode: 'insensitive' as const };
    return {
      tenant_id: tenantId.toString(),
      OR: [
        { full_name: contains },
        { first_name: contains },
        { last_name: contains },
        { primary_email: contains },
        { document_number: contains },
        { phone: contains },
      ],
    };
  }

  private async findOne(where: Prisma.guestsWhereInput): Promise<Guest | null> {
    const row = await this.prisma.guests.findFirst({
      where,
      include: WITH_TAGS,
    });
    return row ? this.toDomain(row) : null;
  }

  private async findMany(where: Prisma.guestsWhereInput): Promise<Guest[]> {
    const rows = await this.prisma.guests.findMany({
      where,
      include: WITH_TAGS,
      orderBy: { created_at: 'desc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  private async paginate(
    where: Prisma.guestsWhereInput,
    page: number,
    limit: number,
    orderBy: Prisma.guestsOrderByWithRelationInput,
  ): Promise<{ guests: Guest[]; total: number }> {
    const [total, rows] = await Promise.all([
      this.prisma.guests.count({ where }),
      this.prisma.guests.findMany({
        where,
        include: WITH_TAGS,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { guests: rows.map((row) => this.toDomain(row)), total };
  }

  private toDomain(row: GuestRowWithTags): Guest {
    const tags = row.guest_tag_assignments.map(({ guest_tags: tag }) =>
      GuestTag.reconstitute(
        GuestTagId.createFromString(tag.id),
        tag.tenant_id ?? PLATFORM_TENANT_ID,
        tag.name,
        tag.created_at,
      ),
    );

    return Guest.reconstitute({
      id: GuestId.createFromString(row.id),
      tenantId: TenantId.createFromString(row.tenant_id),
      guestAccountId: row.guest_account_id
        ? GuestAccountId.createFromString(row.guest_account_id)
        : null,
      identity: {
        documentType: row.document_type ?? undefined,
        documentNumber: row.document_number ?? undefined,
        countryCode: row.country_code ?? undefined,
      },
      firstName: row.first_name,
      lastName: row.last_name,
      fullName: row.full_name,
      primaryEmail: row.primary_email,
      phone: row.phone,
      status: row.status as GuestStatusEnum,
      tags,
      preferences: (row.preferences as unknown as GuestPreferenceItem[]).map(
        (preference): GuestPreferenceItem => ({
          catalogItemId: preference.catalogItemId,
          labelSnapshot: preference.labelSnapshot,
          category: preference.category as GuestPreferenceCategoryEnum,
        }),
      ),
      summary: {
        totalBookings: row.total_bookings,
        totalNights: row.total_nights,
        totalSpend: row.total_spend.toNumber(),
        lastStayAt: row.last_stay_at,
        lastPropertyId: row.last_property_id
          ? PropertyId.create(row.last_property_id)
          : null,
        lastUnitId: row.last_unit_id ? UnitId.create(row.last_unit_id) : null,
      },
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      pendingEmail: row.pending_email,
      emailChangeToken: row.email_change_token,
      emailChangeExpiry: row.email_change_expiry,
    });
  }
}
