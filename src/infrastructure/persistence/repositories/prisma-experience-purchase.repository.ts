import { Injectable } from '@nestjs/common';
import { ExperiencePurchase } from '@/domain/experience-purchase/entities/experience-purchase.entity';
import {
  ExperiencePurchaseRepository,
  TenantExperiencePurchaseFilters,
  TenantExperiencePurchaseReadModel,
} from '@/domain/experience-purchase/repositories/experience-purchase.repository';
import { ExperiencePurchaseId } from '@/domain/experience-purchase/value-objects/experience-purchase-id.vo';
import {
  ExperiencePurchaseStatus,
  ExperiencePurchaseStatusEnum,
} from '@/domain/experience-purchase/value-objects/experience-purchase-status.vo';
import { ExperienceId } from '@/domain/experience/value-objects/experience-id.vo';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { TransactionContextData } from '@/domain/shared/transaction-manager.interface';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import {
  Prisma,
  type experience_purchases as PurchaseRow,
} from '@/infrastructure/persistence/prisma/generated/client';

type PurchaseRowWithNames = PurchaseRow & {
  experiences: { name: string } | null;
  guest_accounts: { full_name: string } | null;
};

@Injectable()
export class PrismaExperiencePurchaseRepository
  implements ExperiencePurchaseRepository
{
  constructor(private readonly prisma: PrismaService) {}

  private client(context?: TransactionContextData) {
    return (context as Prisma.TransactionClient | undefined) ?? this.prisma;
  }

  async save(
    purchase: ExperiencePurchase,
    ctx?: TransactionContextData,
  ): Promise<string> {
    const db = this.client(ctx);
    const id = purchase.getId()?.toString();

    const data = {
      reservation_id: purchase.getReservationId(),
      selected_date: purchase.getSelectedDate(),
      quantity: purchase.getQuantity(),
      unit_price_cop: BigInt(purchase.getUnitPriceCop()),
      total_price_cop: BigInt(purchase.getTotalPriceCop()),
      status: purchase.getStatus().toString(),
      payment_reference: purchase.getPaymentReference(),
      updated_at: purchase.getUpdatedAt(),
    };

    if (id) {
      await db.experience_purchases.update({ where: { id }, data });
      return id;
    }

    const created = await db.experience_purchases.create({
      data: {
        ...data,
        tenant_id: purchase.getTenantId().toString(),
        guest_account_id: purchase.getGuestAccountId().toString(),
        experience_id: purchase.getExperienceId().toString(),
        created_at: purchase.getCreatedAt(),
      },
    });
    return created.id;
  }

  async findById(id: ExperiencePurchaseId): Promise<ExperiencePurchase | null> {
    const row = await this.prisma.experience_purchases.findUnique({
      where: { id: id.toString() },
    });
    return row ? this.toDomainEntity(row) : null;
  }

  async findByGuestAccountId(
    guestAccountId: GuestAccountId,
    tenantId: TenantId,
    page: number,
    limit: number,
  ): Promise<ExperiencePurchase[]> {
    const rows = await this.prisma.experience_purchases.findMany({
      where: {
        guest_account_id: guestAccountId.toString(),
        tenant_id: tenantId.toString(),
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return rows.map((row) => this.toDomainEntity(row));
  }

  async countByGuestAccountId(
    guestAccountId: GuestAccountId,
    tenantId: TenantId,
  ): Promise<number> {
    return this.prisma.experience_purchases.count({
      where: {
        guest_account_id: guestAccountId.toString(),
        tenant_id: tenantId.toString(),
      },
    });
  }

  async findByTenantIdPaginated(
    tenantId: TenantId,
    page: number,
    limit: number,
    filters?: TenantExperiencePurchaseFilters,
  ): Promise<TenantExperiencePurchaseReadModel[]> {
    // the two $lookup stages become a join; the names are display-only
    const rows = await this.prisma.experience_purchases.findMany({
      where: this.buildTenantFilter(tenantId, filters),
      include: {
        experiences: { select: { name: true } },
        guest_accounts: { select: { full_name: true } },
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return rows.map((row: PurchaseRowWithNames) => ({
      id: row.id,
      experienceId: row.experience_id,
      experienceName: row.experiences?.name ?? 'Unknown experience',
      guestAccountId: row.guest_account_id,
      guestName: row.guest_accounts?.full_name ?? 'Unknown guest',
      purchasedAt: row.created_at,
      scheduledDate: row.selected_date,
      quantity: row.quantity,
      totalPriceCop: Number(row.total_price_cop),
      status: row.status,
    }));
  }

  async countByTenantId(
    tenantId: TenantId,
    filters?: TenantExperiencePurchaseFilters,
  ): Promise<number> {
    return this.prisma.experience_purchases.count({
      where: this.buildTenantFilter(tenantId, filters),
    });
  }

  async countConfirmedByExperienceAndDate(
    experienceId: string,
    selectedDate: Date | null,
  ): Promise<number> {
    // selected_date is a DATE column, so the mongo day-window collapses to equality
    return this.prisma.experience_purchases.count({
      where: {
        experience_id: experienceId,
        status: ExperiencePurchaseStatusEnum.CONFIRMED,
        selected_date: selectedDate,
      },
    });
  }

  async findReservedDatesByExperienceId(
    experienceId: ExperienceId,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<Date[]> {
    const rows = await this.prisma.experience_purchases.findMany({
      where: {
        experience_id: experienceId.toString(),
        status: ExperiencePurchaseStatusEnum.CONFIRMED,
        selected_date: {
          not: null,
          ...(dateFrom ? { gte: dateFrom } : {}),
          ...(dateTo ? { lte: dateTo } : {}),
        },
      },
      distinct: ['selected_date'],
      select: { selected_date: true },
    });

    return rows
      .map((row) => row.selected_date)
      .filter((date): date is Date => date !== null);
  }

  private buildTenantFilter(
    tenantId: TenantId,
    filters?: TenantExperiencePurchaseFilters,
  ): Prisma.experience_purchasesWhereInput {
    return {
      tenant_id: tenantId.toString(),
      ...(filters?.experienceId
        ? { experience_id: filters.experienceId }
        : {}),
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.dateFrom || filters?.dateTo
        ? {
            selected_date: {
              ...(filters.dateFrom ? { gte: filters.dateFrom } : {}),
              ...(filters.dateTo ? { lte: filters.dateTo } : {}),
            },
          }
        : {}),
    };
  }

  private toDomainEntity(row: PurchaseRow): ExperiencePurchase {
    return ExperiencePurchase.reconstitute({
      id: ExperiencePurchaseId.createFromString(row.id),
      tenantId: TenantId.createFromString(row.tenant_id),
      guestAccountId: GuestAccountId.createFromString(row.guest_account_id),
      experienceId: ExperienceId.create(row.experience_id),
      reservationId: row.reservation_id,
      selectedDate: row.selected_date,
      quantity: row.quantity,
      unitPriceCop: Number(row.unit_price_cop),
      totalPriceCop: Number(row.total_price_cop),
      status: ExperiencePurchaseStatus.create(
        row.status as ExperiencePurchaseStatusEnum,
      ),
      paymentReference: row.payment_reference,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
