import { DomainException } from '@/domain/shared/exceptions/domain.exception';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { InventoryMovementType } from '@/domain/inventory/value-objects/inventory-movement-type.vo';
import { InventoryItemId } from '@/domain/inventory/value-objects/inventory-item-id.vo';
import { SupplierId } from '@/domain/inventory/value-objects/supplier-id.vo';
import { InventoryItemCategoryId } from '@/domain/inventory/value-objects/inventory-item-category-id.vo';

export class InventoryItem {
  private constructor(
    private readonly id: InventoryItemId | null,
    private readonly tenantId: TenantId,
    private readonly propertyId: PropertyId,
    private readonly sku: string,
    private name: string,
    private categoryId: InventoryItemCategoryId,
    private unit: string,
    private minStock: number,
    private currentStock: number,
    private supplierId: SupplierId | null,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static create(params: {
    tenantId: TenantId;
    propertyId: PropertyId;
    sku: string;
    name: string;
    categoryId: InventoryItemCategoryId;
    unit: string;
    minStock: number;
    initialStock?: number;
    supplierId?: SupplierId | null;
  }): InventoryItem {
    const sku = params.sku.trim();
    const name = params.name.trim();
    const unit = params.unit.trim();
    const initialStock = params.initialStock ?? 0;

    if (!sku) throw new DomainException('SKU is required');
    if (!name) throw new DomainException('Name is required');
    if (!unit) throw new DomainException('Unit is required');
    if (params.minStock < 0)
      throw new DomainException('Min stock cannot be negative');
    if (initialStock < 0)
      throw new DomainException('Initial stock cannot be negative');

    return new InventoryItem(
      null,
      params.tenantId,
      params.propertyId,
      sku,
      name,
      params.categoryId,
      unit,
      params.minStock,
      initialStock,
      params.supplierId ?? null,
      new Date(),
      new Date(),
    );
  }

  static reconstitute(data: {
    identity: {
      id: InventoryItemId;
      tenantId: TenantId;
      propertyId: PropertyId;
    };
    profile: {
      sku: string;
      name: string;
      categoryId: InventoryItemCategoryId;
      unit: string;
      minStock: number;
      currentStock: number;
      supplierId: SupplierId | null;
    };
    timestamps: {
      createdAt: Date;
      updatedAt: Date;
    };
  }): InventoryItem {
    return new InventoryItem(
      data.identity.id,
      data.identity.tenantId,
      data.identity.propertyId,
      data.profile.sku,
      data.profile.name,
      data.profile.categoryId,
      data.profile.unit,
      data.profile.minStock,
      data.profile.currentStock,
      data.profile.supplierId,
      data.timestamps.createdAt,
      data.timestamps.updatedAt,
    );
  }

  applyMovement(type: InventoryMovementType, quantity: number): void {
    if (type === InventoryMovementType.IN) {
      if (quantity <= 0)
        throw new DomainException(
          'IN movement quantity must be greater than 0',
        );
      this.currentStock += quantity;
      this.touch();
      return;
    }

    if (type === InventoryMovementType.OUT) {
      if (quantity <= 0)
        throw new DomainException(
          'OUT movement quantity must be greater than 0',
        );
      if (this.currentStock - quantity < 0) {
        throw new DomainException('Insufficient stock for OUT movement');
      }
      this.currentStock -= quantity;
      this.touch();
      return;
    }

    if (quantity === 0) {
      throw new DomainException('ADJUSTMENT movement quantity cannot be 0');
    }

    if (this.currentStock + quantity < 0) {
      throw new DomainException('Adjustment would leave stock below 0');
    }

    this.currentStock += quantity;
    this.touch();
  }

  isLowStock(): boolean {
    return this.currentStock <= this.minStock;
  }

  getId(): InventoryItemId | null {
    return this.id;
  }

  getTenantId(): TenantId {
    return this.tenantId;
  }

  getPropertyId(): PropertyId {
    return this.propertyId;
  }

  getSku(): string {
    return this.sku;
  }

  getName(): string {
    return this.name;
  }

  getCategoryId(): InventoryItemCategoryId {
    return this.categoryId;
  }

  getUnit(): string {
    return this.unit;
  }

  getMinStock(): number {
    return this.minStock;
  }

  getCurrentStock(): number {
    return this.currentStock;
  }

  getSupplierId(): SupplierId | null {
    return this.supplierId;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  update(params: {
    name?: string;
    categoryId?: InventoryItemCategoryId;
    unit?: string;
    minStock?: number;
    currentStock?: number;
  }): void {
    if (params.name !== undefined) {
      const name = params.name.trim();
      if (!name) throw new DomainException('Name is required');
      this.name = name;
    }

    if (params.categoryId !== undefined) {
      this.categoryId = params.categoryId;
    }

    if (params.unit !== undefined) {
      const unit = params.unit.trim();
      if (!unit) throw new DomainException('Unit is required');
      this.unit = unit;
    }

    if (params.minStock !== undefined) {
      if (params.minStock < 0)
        throw new DomainException('Min stock cannot be negative');
      this.minStock = params.minStock;
    }

    if (params.currentStock !== undefined) {
      if (params.currentStock < 0)
        throw new DomainException('Current stock cannot be negative');
      this.currentStock = params.currentStock;
    }

    this.touch();
  }

  associateSupplier(supplierId: SupplierId): void {
    this.supplierId = supplierId;
    this.touch();
  }

  removeSupplier(): void {
    this.supplierId = null;
    this.touch();
  }

  private touch(): void {
    this.updatedAt = new Date();
  }
}
