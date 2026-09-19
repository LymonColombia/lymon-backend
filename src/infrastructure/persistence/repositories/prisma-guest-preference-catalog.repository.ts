import { Injectable } from '@nestjs/common';
import {
  GuestPreferenceCatalogItem,
  GuestPreferenceCatalogItemReconstitutionData,
  GuestPreferenceSourceEnum,
} from '@/domain/guest-preference/entities/guest-preference-catalog-item.entity';
import { GuestPreferenceCatalogRepository } from '@/domain/guest-preference/repositories/guest-preference-catalog.repository';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { GuestPreferenceCategoryEnum } from '@/domain/guest-preference/value-objects/guest-preference-category.vo';
import { GuestPreferencePredefinedKeyEnum } from '@/domain/guest-preference/value-objects/guest-preference-predefined-key.vo';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import { type guest_preference_catalog_items as CatalogItemRow } from '@/infrastructure/persistence/prisma/generated/client';

@Injectable()
export class PrismaGuestPreferenceCatalogRepository
  implements GuestPreferenceCatalogRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async save(item: GuestPreferenceCatalogItem): Promise<string> {
    const id = item.getId();

    const data = {
      category: item.getCategory(),
      source: item.getSource(),
      key: item.getKey(),
      label: item.getLabel(),
      is_active: item.getIsActive(),
      updated_at: item.getUpdatedAt(),
    };

    if (id) {
      await this.prisma.guest_preference_catalog_items.update({
        where: { id },
        data,
      });
      return id;
    }

    const created = await this.prisma.guest_preference_catalog_items.create({
      data: {
        ...data,
        tenant_id: item.getTenantId().toString(),
        created_at: item.getCreatedAt(),
      },
    });
    return created.id;
  }

  async findByTenant(
    tenantId: TenantId,
  ): Promise<GuestPreferenceCatalogItem[]> {
    const rows = await this.prisma.guest_preference_catalog_items.findMany({
      where: { tenant_id: tenantId.toString() },
      orderBy: { created_at: 'asc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findById(id: string): Promise<GuestPreferenceCatalogItem | null> {
    const row = await this.prisma.guest_preference_catalog_items.findUnique({
      where: { id },
    });
    return row ? this.toDomain(row) : null;
  }

  async delete(id: string): Promise<void> {
    await this.prisma.guest_preference_catalog_items.delete({ where: { id } });
  }

  private toDomain(row: CatalogItemRow): GuestPreferenceCatalogItem {
    const data: GuestPreferenceCatalogItemReconstitutionData = {
      id: row.id,
      tenantId: TenantId.createFromString(row.tenant_id),
      category: row.category as GuestPreferenceCategoryEnum,
      source: row.source as GuestPreferenceSourceEnum,
      key: row.key ? (row.key as GuestPreferencePredefinedKeyEnum) : null,
      label: row.label,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
    return GuestPreferenceCatalogItem.reconstitute(data);
  }
}
