import { Injectable } from '@nestjs/common';
import { InventoryItemCategory } from '@/domain/inventory/entities/inventory-item-category.entity';
import { InventoryItemCategoryRepository } from '@/domain/inventory/repositories/inventory-item-category.repository';
import { InventoryItemCategoryId } from '@/domain/inventory/value-objects/inventory-item-category-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import { type inventory_item_categories as CategoryRow } from '@/infrastructure/persistence/prisma/generated/client';

@Injectable()
export class PrismaInventoryItemCategoryRepository
  implements InventoryItemCategoryRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async save(category: InventoryItemCategory): Promise<string> {
    const id = category.getId()?.toString();

    const data = {
      name: category.getName(),
      description: category.getDescription(),
      updated_at: category.getUpdatedAt(),
    };

    if (id) {
      await this.prisma.inventory_item_categories.update({
        where: { id },
        data,
      });
      return id;
    }

    const created = await this.prisma.inventory_item_categories.create({
      data: {
        ...data,
        tenant_id: category.getTenantId().toString(),
        created_at: category.getCreatedAt(),
      },
    });
    return created.id;
  }

  async findById(
    id: InventoryItemCategoryId,
  ): Promise<InventoryItemCategory | null> {
    const row = await this.prisma.inventory_item_categories.findUnique({
      where: { id: id.toString() },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByName(
    tenantId: TenantId,
    name: string,
  ): Promise<InventoryItemCategory | null> {
    // the mongo version anchored a case-insensitive regex, i.e. a whole-string match
    const row = await this.prisma.inventory_item_categories.findFirst({
      where: {
        tenant_id: tenantId.toString(),
        name: { equals: name.trim(), mode: 'insensitive' },
      },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByTenantId(tenantId: TenantId): Promise<InventoryItemCategory[]> {
    const rows = await this.prisma.inventory_item_categories.findMany({
      where: { tenant_id: tenantId.toString() },
      orderBy: { name: 'asc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: CategoryRow): InventoryItemCategory {
    return InventoryItemCategory.reconstitute({
      id: InventoryItemCategoryId.create(row.id),
      tenantId: TenantId.createFromString(row.tenant_id),
      name: row.name,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
