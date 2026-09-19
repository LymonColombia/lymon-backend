import { Injectable } from '@nestjs/common';
import { Supplier } from '@/domain/inventory/entities/supplier.entity';
import {
  SupplierFindByTenantIdOptions,
  SupplierRepository,
} from '@/domain/inventory/repositories/supplier.repository';
import { SupplierId } from '@/domain/inventory/value-objects/supplier-id.vo';
import { TransactionContextData } from '@/domain/shared/transaction-manager.interface';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import {
  Prisma,
  type suppliers as SupplierRow,
} from '@/infrastructure/persistence/prisma/generated/client';

@Injectable()
export class PrismaSupplierRepository implements SupplierRepository {
  constructor(private readonly prisma: PrismaService) {}

  private client(context?: TransactionContextData) {
    return (context as Prisma.TransactionClient | undefined) ?? this.prisma;
  }

  async save(
    supplier: Supplier,
    transactionContext?: TransactionContextData,
  ): Promise<string> {
    const db = this.client(transactionContext);
    const id = supplier.getId()?.toString();

    const data = {
      name: supplier.getName(),
      contact_email: supplier.getContactEmail(),
      contact_phone: supplier.getContactPhone(),
      country: supplier.getCountry(),
      city: supplier.getCity(),
      nit: supplier.getNit(),
      updated_at: supplier.getUpdatedAt(),
    };

    if (id) {
      await db.suppliers.update({ where: { id }, data });
      return id;
    }

    const created = await db.suppliers.create({
      data: {
        ...data,
        tenant_id: supplier.getTenantId().toString(),
        created_at: supplier.getCreatedAt(),
      },
    });
    return created.id;
  }

  async findById(id: SupplierId): Promise<Supplier | null> {
    const row = await this.prisma.suppliers.findFirst({
      where: { id: id.toString(), deleted_at: null },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByTenantId(
    tenantId: TenantId,
    options?: SupplierFindByTenantIdOptions,
  ): Promise<Supplier[]> {
    const column = options?.sortBy === 'name' ? 'name' : 'created_at';
    const rows = await this.prisma.suppliers.findMany({
      where: { tenant_id: tenantId.toString(), deleted_at: null },
      orderBy: { [column]: options?.sortOrder ?? 'desc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findByNit(tenantId: TenantId, nit: string): Promise<Supplier | null> {
    const row = await this.prisma.suppliers.findFirst({
      where: {
        tenant_id: tenantId.toString(),
        nit: nit.trim().toUpperCase(),
        deleted_at: null,
      },
    });
    return row ? this.toDomain(row) : null;
  }

  async delete(id: SupplierId): Promise<void> {
    await this.prisma.suppliers.update({
      where: { id: id.toString() },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });
  }

  private toDomain(row: SupplierRow): Supplier {
    return Supplier.reconstitute({
      id: SupplierId.create(row.id),
      tenantId: TenantId.createFromString(row.tenant_id),
      name: row.name,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      country: row.country,
      city: row.city,
      nit: row.nit,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    });
  }
}
