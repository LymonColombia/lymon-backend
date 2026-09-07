import { Injectable } from '@nestjs/common';
import { InventoryMovement } from '@/domain/inventory/entities/inventory-movement.entity';
import { InventoryMovementRepository } from '@/domain/inventory/repositories/inventory-movement.repository';
import { InventoryMovementId } from '@/domain/inventory/value-objects/inventory-movement-id.vo';
import { InventoryMovementType } from '@/domain/inventory/value-objects/inventory-movement-type.vo';
import { InventoryItemId } from '@/domain/inventory/value-objects/inventory-item-id.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { TransactionContextData } from '@/domain/shared/transaction-manager.interface';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import {
  Prisma,
  type inventory_movements as InventoryMovementRow,
} from '@/infrastructure/persistence/prisma/generated/client';

@Injectable()
export class PrismaInventoryMovementRepository
  implements InventoryMovementRepository
{
  constructor(private readonly prisma: PrismaService) {}

  private client(context?: TransactionContextData) {
    return (context as Prisma.TransactionClient | undefined) ?? this.prisma;
  }

  async save(
    movement: InventoryMovement,
    transactionContext?: TransactionContextData,
  ): Promise<string> {
    const db = this.client(transactionContext);
    const id = movement.getId()?.toString();

    const data = {
      type: movement.getType(),
      quantity: movement.getQuantity(),
      reason: movement.getReason(),
      reference: movement.getReference(),
      actor_id: movement.getActorId(),
      actor_email: movement.getActorEmail(),
    };

    if (id) {
      await db.inventory_movements.update({ where: { id }, data });
      return id;
    }

    const created = await db.inventory_movements.create({
      data: {
        ...data,
        tenant_id: movement.getTenantId().toString(),
        property_id: movement.getPropertyId().toString(),
        item_id: movement.getItemId().toString(),
      },
    });
    return created.id;
  }

  async findByPropertyId(
    tenantId: TenantId,
    propertyId: PropertyId,
    page: number,
    limit: number,
  ): Promise<InventoryMovement[]> {
    return this.findPage(
      { tenant_id: tenantId.toString(), property_id: propertyId.toString() },
      page,
      limit,
    );
  }

  async findByItemId(
    tenantId: TenantId,
    itemId: InventoryItemId,
    page: number,
    limit: number,
  ): Promise<InventoryMovement[]> {
    return this.findPage(
      { tenant_id: tenantId.toString(), item_id: itemId.toString() },
      page,
      limit,
    );
  }

  private async findPage(
    where: Prisma.inventory_movementsWhereInput,
    page: number,
    limit: number,
  ): Promise<InventoryMovement[]> {
    const rows = await this.prisma.inventory_movements.findMany({
      where,
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: InventoryMovementRow): InventoryMovement {
    return InventoryMovement.reconstitute({
      id: InventoryMovementId.create(row.id),
      tenantId: TenantId.createFromString(row.tenant_id),
      propertyId: PropertyId.create(row.property_id),
      itemId: InventoryItemId.create(row.item_id),
      type: row.type as InventoryMovementType,
      quantity: Number(row.quantity),
      reason: row.reason,
      reference: row.reference,
      actorId: row.actor_id,
      actorEmail: row.actor_email,
      createdAt: row.created_at,
    });
  }
}
