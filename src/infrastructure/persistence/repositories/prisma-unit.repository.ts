import { Injectable } from '@nestjs/common';
import { Unit } from '@/domain/unit/entities/unit.entity';
import { UnitRepository } from '@/domain/unit/repositories/unit.repository';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import { Bedroom } from '@/domain/unit/value-objects/bed-type.vo';
import { ExternalIds } from '@/domain/unit/value-objects/external-ids.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { TransactionContextData } from '@/domain/shared/transaction-manager.interface';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import {
  Prisma,
  type units as UnitRow,
} from '@/infrastructure/persistence/prisma/generated/client';

@Injectable()
export class PrismaUnitRepository implements UnitRepository {
  constructor(private readonly prisma: PrismaService) {}

  private client(context?: TransactionContextData) {
    return (context as Prisma.TransactionClient | undefined) ?? this.prisma;
  }

  async save(
    unit: Unit,
    transactionContext?: TransactionContextData,
  ): Promise<string> {
    const id = unit.getId()?.toString();
    const db = this.client(transactionContext);
    const externalIds = unit.getExternalIds();

    const data = {
      name: unit.getName(),
      description: unit.getDescription(),
      inventory_count: unit.getInventoryCount(),
      max_guests: unit.getMaxGuests(),
      standard_guests: unit.getStandardGuests(),
      bedrooms: unit.getBedrooms() as unknown as Prisma.InputJsonValue,
      bathrooms_count: unit.getBathroomsCount(),
      is_shared: unit.getIsShared(),
      amenities: unit.getAmenities(),
      media_keys: unit.getMediaKeys(),
      price_per_night: unit.getPricePerNight(),
      rating: unit.getRating(),
      external_airbnb_id: externalIds.getAirbnbId() ?? null,
      external_booking_id: externalIds.getBookingId() ?? null,
      external_vrbo_id: externalIds.getVrboId() ?? null,
      updated_at: unit.getUpdatedAt(),
    };

    if (id) {
      await db.units.update({ where: { id }, data });
      return id;
    }

    const created = await db.units.create({
      data: {
        ...data,
        tenant_id: unit.getTenantId().toString(),
        property_id: unit.getPropertyId().toString(),
        created_at: unit.getCreatedAt(),
      },
    });
    return created.id;
  }

  async findById(id: UnitId): Promise<Unit | null> {
    const row = await this.prisma.units.findFirst({
      where: { id: id.toString(), deleted_at: null },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByPropertyId(propertyId: PropertyId): Promise<Unit[]> {
    const rows = await this.prisma.units.findMany({
      where: { property_id: propertyId.toString(), deleted_at: null },
      orderBy: { created_at: 'desc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findByTenantId(tenantId: TenantId): Promise<Unit[]> {
    const rows = await this.prisma.units.findMany({
      where: { tenant_id: tenantId.toString(), deleted_at: null },
      orderBy: { created_at: 'desc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findByTenantIdPaginated(
    tenantId: TenantId,
    page: number,
    limit: number,
    minGuests?: number,
    propertyId?: string,
  ): Promise<{ units: Unit[]; total: number }> {
    return this.paginate(
      {
        tenant_id: tenantId.toString(),
        deleted_at: null,
        ...(minGuests !== undefined ? { max_guests: { gte: minGuests } } : {}),
        ...(propertyId ? { property_id: propertyId } : {}),
      },
      page,
      limit,
      { created_at: 'desc' },
    );
  }

  async findAllPaginated(
    page: number,
    limit: number,
    minGuests?: number,
    propertyId?: string,
    sortByPrice?: 'asc' | 'desc',
    name?: string,
  ): Promise<{ units: Unit[]; total: number }> {
    return this.paginate(
      {
        deleted_at: null,
        ...(minGuests !== undefined ? { max_guests: { gte: minGuests } } : {}),
        ...(propertyId ? { property_id: propertyId } : {}),
        // literal substring, unlike the mongo $regex this replaces: a name containing
        // regex metacharacters used to change the query's meaning
        ...(name
          ? { name: { contains: name.trim(), mode: 'insensitive' as const } }
          : {}),
      },
      page,
      limit,
      sortByPrice ? { price_per_night: sortByPrice } : { created_at: 'desc' },
    );
  }

  private async paginate(
    where: Prisma.unitsWhereInput,
    page: number,
    limit: number,
    orderBy: Prisma.unitsOrderByWithRelationInput,
  ): Promise<{ units: Unit[]; total: number }> {
    const [total, rows] = await Promise.all([
      this.prisma.units.count({ where }),
      this.prisma.units.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { units: rows.map((row) => this.toDomain(row)), total };
  }

  async countByTenantId(tenantId: TenantId): Promise<number> {
    return this.prisma.units.count({
      where: { tenant_id: tenantId.toString(), deleted_at: null },
    });
  }

  async delete(id: UnitId): Promise<void> {
    await this.prisma.units.update({
      where: { id: id.toString() },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });
  }

  async findByIds(ids: UnitId[]): Promise<Unit[]> {
    if (!ids.length) return [];
    const rows = await this.prisma.units.findMany({
      where: { id: { in: ids.map((id) => id.toString()) }, deleted_at: null },
    });
    return rows.map((row) => this.toDomain(row));
  }

  private toDomain(row: UnitRow): Unit {
    return Unit.reconstitute({
      id: UnitId.create(row.id),
      tenantId: TenantId.createFromString(row.tenant_id),
      propertyId: PropertyId.create(row.property_id),
      basicInfo: {
        name: row.name,
        description: row.description,
      },
      inventoryConfig: {
        inventoryCount: row.inventory_count,
      },
      capacityConfig: {
        maxGuests: row.max_guests,
        standardGuests: row.standard_guests,
      },
      physicalFeatures: {
        bedrooms: row.bedrooms as unknown as Bedroom[],
        bathroomsCount: row.bathrooms_count,
        isShared: row.is_shared,
      },
      pricingConfig: {
        pricePerNight: row.price_per_night.toNumber(),
      },
      amenities: row.amenities,
      mediaKeys: row.media_keys,
      externalIds: ExternalIds.create(
        row.external_airbnb_id ?? undefined,
        row.external_booking_id ?? undefined,
        row.external_vrbo_id ?? undefined,
      ),
      rating: row.rating?.toNumber() ?? null,
      timestamps: {
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      },
    });
  }
}
