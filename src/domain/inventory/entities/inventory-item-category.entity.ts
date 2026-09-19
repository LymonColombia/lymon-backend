import { DomainException } from '@/domain/shared/exceptions/domain.exception';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { InventoryItemCategoryId } from '@/domain/inventory/value-objects/inventory-item-category-id.vo';

export class InventoryItemCategory {
  private constructor(
    private readonly id: InventoryItemCategoryId | null,
    private readonly tenantId: TenantId,
    private readonly name: string,
    private readonly description: string | null,
    private readonly createdAt: Date,
    private readonly updatedAt: Date,
  ) {}

  static create(params: {
    tenantId: TenantId;
    name: string;
    description?: string | null;
  }): InventoryItemCategory {
    const name = params.name.trim();
    if (!name) throw new DomainException('Category name is required');

    return new InventoryItemCategory(
      null,
      params.tenantId,
      name,
      params.description?.trim() ?? null,
      new Date(),
      new Date(),
    );
  }

  static reconstitute(data: {
    id: InventoryItemCategoryId;
    tenantId: TenantId;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): InventoryItemCategory {
    return new InventoryItemCategory(
      data.id,
      data.tenantId,
      data.name,
      data.description,
      data.createdAt,
      data.updatedAt,
    );
  }

  getId(): InventoryItemCategoryId | null {
    return this.id;
  }

  getTenantId(): TenantId {
    return this.tenantId;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string | null {
    return this.description;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }
}
