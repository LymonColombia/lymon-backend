import { ExperiencePurchase } from '@/domain/experience-purchase/entities/experience-purchase.entity';
import { ExperienceId } from '@/domain/experience/value-objects/experience-id.vo';
import { ExperiencePurchaseId } from '@/domain/experience-purchase/value-objects/experience-purchase-id.vo';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { TransactionContextData } from '@/domain/shared/transaction-manager.interface';
import { ExperiencePurchaseStatusEnum } from '@/domain/experience-purchase/value-objects/experience-purchase-status.vo';

export const EXPERIENCE_PURCHASE_REPOSITORY = 'EXPERIENCE_PURCHASE_REPOSITORY';

export interface TenantExperiencePurchaseFilters {
  experienceId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  status?: ExperiencePurchaseStatusEnum;
}

export interface TenantExperiencePurchaseReadModel {
  id: string;
  experienceId: string;
  experienceName: string;
  guestAccountId: string;
  guestName: string;
  purchasedAt: Date;
  scheduledDate: Date | null;
  quantity: number;
  totalPriceCop: number;
  status: string;
}

export interface ExperiencePurchaseRepository {
  save(
    purchase: ExperiencePurchase,
    ctx?: TransactionContextData,
  ): Promise<string>;
  findById(id: ExperiencePurchaseId): Promise<ExperiencePurchase | null>;
  findByGuestAccountId(
    guestAccountId: GuestAccountId,
    tenantId: TenantId,
    page: number,
    limit: number,
  ): Promise<ExperiencePurchase[]>;
  countByGuestAccountId(
    guestAccountId: GuestAccountId,
    tenantId: TenantId,
  ): Promise<number>;
  findByTenantIdPaginated(
    tenantId: TenantId,
    page: number,
    limit: number,
    filters?: TenantExperiencePurchaseFilters,
  ): Promise<TenantExperiencePurchaseReadModel[]>;
  countByTenantId(
    tenantId: TenantId,
    filters?: TenantExperiencePurchaseFilters,
  ): Promise<number>;
  countConfirmedByExperienceAndDate(
    experienceId: string,
    selectedDate: Date | null,
  ): Promise<number>;
  findReservedDatesByExperienceId(
    experienceId: ExperienceId,
    dateFrom?: Date,
    dateTo?: Date,
  ): Promise<Date[]>;
}
