import { Injectable } from '@nestjs/common';
import { InventoryItem } from '@/domain/inventory/entities/inventory-item.entity';
import { InventoryItemRepository } from '@/domain/inventory/repositories/inventory-item.repository';
import { InventoryItemId } from '@/domain/inventory/value-objects/inventory-item-id.vo';
import { InventoryItemCategoryId } from '@/domain/inventory/value-objects/inventory-item-category-id.vo';
import { SupplierId } from '@/domain/inventory/value-objects/supplier-id.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { TransactionContextData } from '@/domain/shared/transaction-manager.interface';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import {
  Prisma,
  type inventory_items as InventoryItemRow,
} from '@/infrastructure/persistence/prisma/generated/client';

@Injectable()
export class PrismaInventoryItemRepository implements InventoryItemRepository {
  constructor(private readonly prisma: PrismaService) {}

  private client(context?: TransactionContextData) {
    return (context as Prisma.TransactionClient | undefined) ?? this.prisma;
  }

  async save(
    item: InventoryItem,
    transactionContext?: TransactionContextData,
  ): Promise<string> {
    const db = this.client(transactionContext);
    const id = item.getId()?.toString();

    const data = {
      sku: item.getSku(),
      name: item.getName(),
      category_id: item.getCategoryId().toString(),
      unit: item.getUnit(),
      min_stock: item.getMinStock(),
      current_stock: item.getCurrentStock(),
      supplier_id: item.getSupplierId()?.toString() ?? null,
      updated_at: item.getUpdatedAt(),
    };

    if (id) {
      await db.inventory_items.update({ where: { id }, data });
      return id;
    }

    const created = await db.inventory_items.create({
      data: {
        ...data,
        tenant_id: item.getTenantId().toString(),
        property_id: item.getPropertyId().toString(),
        created_at: item.getCreatedAt(),
      },
    });
    return created.id;
  }

  async findById(id: InventoryItemId): Promise<InventoryItem | null> {
    const row = await this.prisma.inventory_items.findFirst({
      where: { id: id.toString(), deleted_at: null },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByPropertyId(
    tenantId: TenantId,
    propertyId: PropertyId,
  ): Promise<InventoryItem[]> {
    return this.findMany({
      tenant_id: tenantId.toString(),
      property_id: propertyId.toString(),
      deleted_at: null,
    });
  }

  async findBySupplierId(
    tenantId: TenantId,
    supplierId: SupplierId,
  ): Promise<InventoryItem[]> {
    return this.findMany({
      tenant_id: tenantId.toString(),
      supplier_id: supplierId.toString(),
      deleted_at: null,
    });
  }

  async findLowStockByPropertyId(
    tenantId: TenantId,
    propertyId: PropertyId,
  ): Promise<InventoryItem[]> {
    // comparing two columns has no `where` form in Prisma, so this one stays raw SQL;
    // there is a matching partial index on (tenant_id) WHERE current_stock <= min_stock
    const rows = await this.prisma.$queryRaw<InventoryItemRow[]>`
      SELECT * FROM inventory_items
      WHERE tenant_id = ${tenantId.toString()}::uuid
        AND property_id = ${propertyId.toString()}::uuid
        AND deleted_at IS NULL
        AND current_stock <= min_stock
      ORDER BY current_stock ASC, updated_at DESC
    `;
    return rows.map((row) => this.toDomain(row));
  }

  async findByPropertyIdAndSku(
    tenantId: TenantId,
    propertyId: PropertyId,
    sku: string,
  ): Promise<InventoryItem | null> {
    const row = await this.prisma.inventory_items.findFirst({
      where: {
        tenant_id: tenantId.toString(),
        property_id: propertyId.toString(),
        sku: sku.trim(),
        deleted_at: null,
      },
    });
    return row ? this.toDomain(row) : null;
  }

  async delete(id: InventoryItemId): Promise<void> {
    await this.prisma.inventory_items.update({
      where: { id: id.toString() },
      data: { deleted_at: new Date() },
    });
  }

  private async findMany(
    where: Prisma.inventory_itemsWhereInput,
  ): Promise<InventoryItem[]> {
    const rows = await this.prisma.inventory_items.findMany({
      where,
      orderBy: { created_at: 'desc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: InventoryItemRow): InventoryItem {
    return InventoryItem.reconstitute({
      identity: {
        id: InventoryItemId.create(row.id),
        tenantId: TenantId.createFromString(row.tenant_id),
        propertyId: PropertyId.create(row.property_id),
      },
      profile: {
        sku: row.sku,
        name: row.name,
        categoryId: InventoryItemCategoryId.create(row.category_id),
        unit: row.unit,
        minStock: Number(row.min_stock),
        currentStock: Number(row.current_stock),
        supplierId: row.supplier_id
          ? SupplierId.create(row.supplier_id)
          : null,
      },
      timestamps: {
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  }
}
