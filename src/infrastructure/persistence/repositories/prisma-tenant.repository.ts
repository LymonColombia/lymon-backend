import { Injectable } from '@nestjs/common';
import {
  Tenant,
  TenantReconstitutionProps,
} from '@/domain/tenant/entities/tenant.entity';
import { TenantRepository } from '@/domain/tenant/repositories/tenant.repository';
import { Email } from '@/domain/shared/value-objects/email.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { PlanType } from '@/domain/tenant/value-objects/plan-type.vo';
import { TenantTheme } from '@/domain/tenant/value-objects/tenant-theme';
import { generateUniqueSlug } from '@/domain/shared/utils/slug.util';
import { uuidv7 } from '@/domain/shared/value-objects/uuid.util';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import {
  Prisma,
  type tenants as TenantRow,
} from '@/infrastructure/persistence/prisma/generated/client';

@Injectable()
export class PrismaTenantRepository implements TenantRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(tenant: Tenant): Promise<void> {
    const id = tenant.getId()?.toString();

    const data = {
      name: tenant.getName(),
      owner_email: tenant.getOwnerEmail().toString(),
      plan: tenant.getPlan().toString(),
      email_verified: tenant.isEmailVerified(),
      contact_phone: tenant.getContactPhone(),
      address: tenant.getAddress(),
      description: tenant.getDescription(),
      logo_key: tenant.getLogoKey(),
      // TenantTheme is a plain VO interface; Prisma's Json input wants an index signature.
      theme: (tenant.getTheme() as Prisma.InputJsonObject | null) ?? Prisma.DbNull,
      updated_at: tenant.getUpdatedAt(),
      deleted_at: tenant.getDeletedAt(),
      trial_ends_at: tenant.getTrialEndsAt(),
    };

    if (id) {
      const existing = await this.prisma.tenants.findUnique({
        where: { id },
        select: { name: true, slug: true },
      });
      const slug =
        existing && existing.name !== tenant.getName()
          ? await this.generateSlugForId(tenant.getName(), id)
          : existing?.slug;

      await this.prisma.tenants.update({
        where: { id },
        data: slug ? { ...data, slug } : data,
      });
      return;
    }

    // slug is NOT NULL and derived from the id, so mint the uuid here instead of
    // letting the database's uuidv7() do it — one insert rather than insert-then-update.
    const newId = uuidv7();
    await this.prisma.tenants.create({
      data: {
        ...data,
        id: newId,
        slug: await this.generateSlugForId(tenant.getName(), newId),
        created_at: tenant.getCreatedAt(),
      },
    });
  }

  private async generateSlugForId(name: string, id: string): Promise<string> {
    return generateUniqueSlug(name, id, async (candidate) => {
      const taken = await this.prisma.tenants.findFirst({
        where: { slug: candidate, id: { not: id } },
        select: { id: true },
      });
      return taken !== null;
    });
  }

  async findById(id: TenantId): Promise<Tenant | null> {
    const row = await this.prisma.tenants.findFirst({
      where: { id: id.toString(), deleted_at: null },
    });
    return row ? this.toDomainEntity(row) : null;
  }

  async findByOwnerEmail(email: Email): Promise<Tenant | null> {
    const row = await this.prisma.tenants.findFirst({
      where: { owner_email: email.toString(), deleted_at: null },
    });
    return row ? this.toDomainEntity(row) : null;
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    // ponytail: direct lookup. The mongo version also scanned every tenant comparing
    // createSlug(name), a fallback for legacy docs with no slug; slug is NOT NULL here.
    const row = await this.prisma.tenants.findFirst({
      where: { slug, deleted_at: null },
    });
    return row ? this.toDomainEntity(row) : null;
  }

  async exists(email: Email): Promise<boolean> {
    const count = await this.prisma.tenants.count({
      where: { owner_email: email.toString(), deleted_at: null },
    });
    return count > 0;
  }

  private toDomainEntity(row: TenantRow): Tenant {
    const props: TenantReconstitutionProps = {
      id: TenantId.createFromString(row.id),
      name: row.name,
      slug: row.slug,
      ownerEmail: Email.create(row.owner_email),
      plan: PlanType.create(row.plan),
      emailVerified: row.email_verified,
      contactPhone: row.contact_phone,
      address: row.address,
      description: row.description,
      logoKey: row.logo_key,
      theme: (row.theme as TenantTheme | null) ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
      trialEndsAt: row.trial_ends_at,
    };
    return Tenant.reconstitute(props);
  }
}
