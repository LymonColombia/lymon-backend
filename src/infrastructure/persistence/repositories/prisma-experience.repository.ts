import { Injectable } from '@nestjs/common';
import { Experience } from '@/domain/experience/entities/experience.entity';
import {
  AvailableExperienceFilters,
  ExperienceRepository,
} from '@/domain/experience/repositories/experience.repository';
import { ExperienceId } from '@/domain/experience/value-objects/experience-id.vo';
import { ExperienceCategory } from '@/domain/experience/value-objects/experience-category.vo';
import { ExperienceStatus } from '@/domain/experience/value-objects/experience-status.vo';
import { ExperienceAvailabilityType } from '@/domain/experience/value-objects/experience-availability-type.vo';
import {
  ExperienceScope,
  ExperienceScopeEnum,
} from '@/domain/experience/value-objects/experience-scope.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { TransactionContextData } from '@/domain/shared/transaction-manager.interface';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import {
  Prisma,
  type experiences as ExperienceRow,
} from '@/infrastructure/persistence/prisma/generated/client';

interface StoredRecurrence {
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
}

@Injectable()
export class PrismaExperienceRepository implements ExperienceRepository {
  constructor(private readonly prisma: PrismaService) {}

  private client(context?: TransactionContextData) {
    return (context as Prisma.TransactionClient | undefined) ?? this.prisma;
  }

  async save(
    experience: Experience,
    transactionContext?: TransactionContextData,
  ): Promise<string> {
    const db = this.client(transactionContext);
    const id = experience.getId()?.toString();
    const recurrence = experience.getRecurrence();

    const data = {
      property_id: experience.getPropertyId()?.toString() ?? null,
      scope: experience.getScope().toString(),
      name: experience.getName(),
      description: experience.getDescription(),
      city: experience.getCity(),
      category: experience.getCategory().toString(),
      price_cop: BigInt(experience.getPriceCop()),
      minimum_participants: experience.getMinimumParticipants(),
      capacity: experience.getCapacity(),
      availability_type: experience.getAvailabilityType().toString(),
      recurrence: recurrence
        ? (recurrence as unknown as Prisma.InputJsonValue)
        : Prisma.DbNull,
      allow_standalone_purchase: experience.getAllowStandalonePurchase(),
      allow_reservation_purchase: experience.getAllowReservationPurchase(),
      media_keys: experience.getMediaKeys(),
      min_notice_hours: experience.getMinNoticeHours(),
      purchase_cutoff_hours: experience.getPurchaseCutoffHours(),
      status: experience.getStatus().toString(),
      updated_at: experience.getUpdatedAt(),
    };

    if (id) {
      await db.experiences.update({ where: { id }, data });
      return id;
    }

    const created = await db.experiences.create({
      data: {
        ...data,
        tenant_id: experience.getTenantId().toString(),
        created_at: experience.getCreatedAt(),
      },
    });
    return created.id;
  }

  async findById(id: ExperienceId): Promise<Experience | null> {
    const row = await this.prisma.experiences.findFirst({
      where: { id: id.toString(), deleted_at: null },
    });
    return row ? this.toDomain(row) : null;
  }

  async existsByPropertyIdAndName(
    propertyId: PropertyId,
    name: string,
  ): Promise<boolean> {
    const row = await this.prisma.experiences.findFirst({
      where: {
        property_id: propertyId.toString(),
        name: { equals: name.trim(), mode: 'insensitive' },
        deleted_at: null,
      },
      select: { id: true },
    });
    return row !== null;
  }

  async findByTenantIdPaginated(
    tenantId: TenantId,
    page: number,
    limit: number,
    propertyId?: PropertyId,
    minCapacity?: number,
  ): Promise<{ experiences: Experience[]; total: number }> {
    return this.paginate(
      {
        tenant_id: tenantId.toString(),
        deleted_at: null,
        ...(propertyId ? { property_id: propertyId.toString() } : {}),
        ...(minCapacity ? { capacity: { gte: minCapacity } } : {}),
      },
      page,
      limit,
      { created_at: 'desc' },
    );
  }

  async findAvailableForGuestPaginated(
    filters: AvailableExperienceFilters,
    page: number,
    limit: number,
  ): Promise<{ experiences: Experience[]; total: number }> {
    const where: Prisma.experiencesWhereInput = {
      status: ExperienceStatus.active().toString(),
      deleted_at: null,
      ...(filters.tenantId ? { tenant_id: filters.tenantId.toString() } : {}),
      ...(filters.category ? { category: filters.category.toString() } : {}),
      ...(filters.propertyId
        ? { property_id: filters.propertyId.toString() }
        : {}),
      ...(filters.scope === ExperienceScopeEnum.GLOBAL
        ? { property_id: null }
        : filters.scope === ExperienceScopeEnum.PROPERTY
          ? { property_id: { not: null } }
          : {}),
      // whole-string match, as the anchored regex the mongo version built
      ...(filters.city
        ? { city: { equals: filters.city, mode: 'insensitive' as const } }
        : {}),
    };

    return this.paginate(
      where,
      page,
      limit,
      filters.sortByPrice
        ? { price_cop: filters.sortByPrice }
        : { created_at: 'desc' },
    );
  }

  async delete(id: ExperienceId): Promise<void> {
    await this.prisma.experiences.update({
      where: { id: id.toString() },
      data: { deleted_at: new Date(), updated_at: new Date() },
    });
  }

  private async paginate(
    where: Prisma.experiencesWhereInput,
    page: number,
    limit: number,
    orderBy: Prisma.experiencesOrderByWithRelationInput,
  ): Promise<{ experiences: Experience[]; total: number }> {
    const [total, rows] = await Promise.all([
      this.prisma.experiences.count({ where }),
      this.prisma.experiences.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { experiences: rows.map((row) => this.toDomain(row)), total };
  }

  private toDomain(row: ExperienceRow): Experience {
    const recurrence = row.recurrence as unknown as StoredRecurrence | null;

    return Experience.reconstitute({
      id: ExperienceId.create(row.id),
      tenantId: TenantId.createFromString(row.tenant_id),
      propertyId: row.property_id
        ? PropertyId.create(row.property_id)
        : undefined,
      scope: ExperienceScope.create(row.scope),
      name: row.name,
      description: row.description,
      city: row.city,
      category: ExperienceCategory.create(row.category),
      priceCop: Number(row.price_cop),
      minimumParticipants: row.minimum_participants,
      capacity: row.capacity,
      availabilityType: ExperienceAvailabilityType.create(
        row.availability_type,
      ),
      recurrence: recurrence
        ? {
            daysOfWeek: recurrence.daysOfWeek,
            startTime: recurrence.startTime,
            endTime: recurrence.endTime,
          }
        : undefined,
      allowStandalonePurchase: row.allow_standalone_purchase,
      allowReservationPurchase: row.allow_reservation_purchase,
      mediaKeys: row.media_keys,
      minNoticeHours: row.min_notice_hours,
      purchaseCutoffHours: row.purchase_cutoff_hours,
      status: ExperienceStatus.create(row.status),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      deletedAt: row.deleted_at,
    });
  }
}
