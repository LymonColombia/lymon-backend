import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { Property } from '@/domain/property/entities/property.entity';
import { PropertyRepository } from '@/domain/property/repositories/property.repository';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { PropertyType } from '@/domain/property/value-objects/property-type.vo';
import { CancellationPolicy } from '@/domain/property/value-objects/cancellation-policy.vo';
import { Location } from '@/domain/property/value-objects/location.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { TransactionContextData } from '@/domain/shared/transaction-manager.interface';
import { generateUniqueSlug } from '@/domain/shared/utils/slug.util';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import {
  Prisma,
  type properties as PropertyRow,
} from '@/infrastructure/persistence/prisma/generated/client';
import { fromSqlTime, toSqlTime } from './sql-time.util';

@Injectable()
export class PrismaPropertyRepository implements PropertyRepository {
  constructor(private readonly prisma: PrismaService) {}

  private client(context?: TransactionContextData) {
    return (context as Prisma.TransactionClient | undefined) ?? this.prisma;
  }

  async save(
    property: Property,
    transactionContext?: TransactionContextData,
  ): Promise<string> {
    const id = property.getId()?.toString();
    const db = this.client(transactionContext);
    const location = property.getLocation();

    const data = {
      name: property.getName(),
      description: property.getDescription(),
      property_type: property.getPropertyType().toString(),
      address: property.getAddress(),
      city: property.getCity(),
      state: property.getState(),
      country: property.getCountry(),
      zip_code: property.getZipCode(),
      lat: location.getLat(),
      lng: location.getLng(),
      check_in_time: toSqlTime(property.getCheckInTime()),
      check_out_time: toSqlTime(property.getCheckOutTime()),
      cancellation_policy: property.getCancellationPolicy().toString(),
      host_phone: property.getHostPhone(),
      host_email: property.getHostEmail(),
      image_key: property.getImageKey(),
      updated_at: property.getUpdatedAt(),
    };

    const tenantId = property.getTenantId().toString();

    if (id) {
      const existing = await db.properties.findUnique({
        where: { id },
        select: { name: true, slug: true },
      });
      const slug =
        existing && existing.name !== property.getName()
          ? await this.generateSlugForId(db, tenantId, property.getName(), id)
          : existing?.slug;

      await db.properties.update({
        where: { id },
        data: slug ? { ...data, slug } : data,
      });
      return id;
    }

    // slug is NOT NULL and derived from the id, so mint the uuid here instead of
    // letting gen_random_uuid() do it — one insert rather than insert-then-update.
    const newId = randomUUID();
    await db.properties.create({
      data: {
        ...data,
        id: newId,
        tenant_id: tenantId,
        slug: await this.generateSlugForId(
          db,
          tenantId,
          property.getName(),
          newId,
        ),
        created_at: property.getCreatedAt(),
      },
    });
    return newId;
  }

  /** Slugs are unique per tenant, so the taken-check is tenant-scoped. */
  private async generateSlugForId(
    db: ReturnType<PrismaPropertyRepository['client']>,
    tenantId: string,
    name: string,
    id: string,
  ): Promise<string> {
    return generateUniqueSlug(name, id, async (candidate) => {
      const taken = await db.properties.findFirst({
        where: { tenant_id: tenantId, slug: candidate, id: { not: id } },
        select: { id: true },
      });
      return taken !== null;
    });
  }

  async findById(id: PropertyId): Promise<Property | null> {
    const row = await this.prisma.properties.findFirst({
      where: { id: id.toString(), deleted_at: null },
    });
    return row ? this.toDomain(row) : null;
  }

  async findByTenantId(tenantId: TenantId): Promise<Property[]> {
    const rows = await this.prisma.properties.findMany({
      where: { tenant_id: tenantId.toString(), deleted_at: null },
      orderBy: { created_at: 'desc' },
    });
    return rows.map((row) => this.toDomain(row));
  }

  async findByTenantIdAndSlug(
    tenantId: TenantId,
    slug: string,
  ): Promise<Property | null> {
    // ponytail: direct lookup on the (tenant_id, slug) unique index. The mongo version
    // scanned every property comparing createSlug(name), a fallback for docs written
    // before slug existed; the column is NOT NULL here.
    const row = await this.prisma.properties.findFirst({
      where: { tenant_id: tenantId.toString(), slug, deleted_at: null },
    });
    return row ? this.toDomain(row) : null;
  }

  async countByTenantId(tenantId: TenantId): Promise<number> {
    return this.prisma.properties.count({
      where: { tenant_id: tenantId.toString(), deleted_at: null },
    });
  }

  async delete(id: PropertyId): Promise<void> {
    await this.prisma.properties.update({
      where: { id: id.toString() },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });
  }

  private toDomain(row: PropertyRow): Property {
    return Property.reconstitute({
      id: PropertyId.create(row.id),
      tenantId: TenantId.createFromString(row.tenant_id),
      name: row.name,
      slug: row.slug,
      description: row.description,
      propertyType: PropertyType.create(row.property_type),
      address: row.address,
      city: row.city,
      state: row.state,
      country: row.country,
      zipCode: row.zip_code,
      location: Location.create(row.lat.toNumber(), row.lng.toNumber()),
      checkInTime: fromSqlTime(row.check_in_time),
      checkOutTime: fromSqlTime(row.check_out_time),
      cancellationPolicy: CancellationPolicy.create(row.cancellation_policy),
      hostPhone: row.host_phone,
      hostEmail: row.host_email,
      imageKey: row.image_key,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    });
  }
}
