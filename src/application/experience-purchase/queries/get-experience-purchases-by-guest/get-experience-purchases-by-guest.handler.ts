import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetExperiencePurchasesByGuestQuery } from './get-experience-purchases-by-guest.query';
import {
  EXPERIENCE_PURCHASE_REPOSITORY,
  type ExperiencePurchaseRepository,
} from '@/domain/experience-purchase/repositories/experience-purchase.repository';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

export interface ExperiencePurchaseSummary {
  id: string;
  experienceId: string;
  reservationId: string | null;
  selectedDate: Date | null;
  quantity: number;
  unitPriceCop: number;
  totalPriceCop: number;
  status: string;
  paymentReference: string | null;
  createdAt: Date;
}

export interface GetExperiencePurchasesByGuestResult {
  purchases: ExperiencePurchaseSummary[];
  total: number;
  page: number;
  limit: number;
}

@QueryHandler(GetExperiencePurchasesByGuestQuery)
export class GetExperiencePurchasesByGuestHandler implements IQueryHandler<GetExperiencePurchasesByGuestQuery> {
  constructor(
    @Inject(EXPERIENCE_PURCHASE_REPOSITORY)
    private readonly purchaseRepository: ExperiencePurchaseRepository,
  ) {}

  async execute(
    query: GetExperiencePurchasesByGuestQuery,
  ): Promise<GetExperiencePurchasesByGuestResult> {
    const guestAccountId = GuestAccountId.createFromString(
      query.guestAccountId,
    );
    const tenantId = TenantId.createFromString(query.tenantId);

    const [purchases, total] = await Promise.all([
      this.purchaseRepository.findByGuestAccountId(
        guestAccountId,
        tenantId,
        query.page,
        query.limit,
      ),
      this.purchaseRepository.countByGuestAccountId(guestAccountId, tenantId),
    ]);

    return {
      purchases: purchases.map((p) => ({
        id: p.getId()!.toString(),
        experienceId: p.getExperienceId().toString(),
        reservationId: p.getReservationId(),
        selectedDate: p.getSelectedDate(),
        quantity: p.getQuantity(),
        unitPriceCop: p.getUnitPriceCop(),
        totalPriceCop: p.getTotalPriceCop(),
        status: p.getStatus().toString(),
        paymentReference: p.getPaymentReference(),
        createdAt: p.getCreatedAt(),
      })),
      total,
      page: query.page,
      limit: query.limit,
    };
  }
}
