import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetExperiencePurchaseByIdQuery } from './get-experience-purchase-by-id.query';
import {
  EXPERIENCE_PURCHASE_REPOSITORY,
  type ExperiencePurchaseRepository,
} from '@/domain/experience-purchase/repositories/experience-purchase.repository';
import { ExperiencePurchaseId } from '@/domain/experience-purchase/value-objects/experience-purchase-id.vo';
import { DomainException } from '@/domain/shared/exceptions/domain.exception';

@QueryHandler(GetExperiencePurchaseByIdQuery)
export class GetExperiencePurchaseByIdHandler implements IQueryHandler<GetExperiencePurchaseByIdQuery> {
  constructor(
    @Inject(EXPERIENCE_PURCHASE_REPOSITORY)
    private readonly purchaseRepository: ExperiencePurchaseRepository,
  ) {}

  async execute(query: GetExperiencePurchaseByIdQuery) {
    const purchase = await this.purchaseRepository.findById(
      ExperiencePurchaseId.createFromString(query.purchaseId),
    );
    if (!purchase) {
      throw new NotFoundException('Experience purchase not found');
    }
    if (purchase.getGuestAccountId().toString() !== query.guestAccountId) {
      throw new DomainException('Purchase does not belong to this guest');
    }

    return {
      id: purchase.getId()!.toString(),
      experienceId: purchase.getExperienceId().toString(),
      reservationId: purchase.getReservationId(),
      selectedDate: purchase.getSelectedDate(),
      quantity: purchase.getQuantity(),
      unitPriceCop: purchase.getUnitPriceCop(),
      totalPriceCop: purchase.getTotalPriceCop(),
      status: purchase.getStatus().toString(),
      paymentReference: purchase.getPaymentReference(),
      createdAt: purchase.getCreatedAt(),
      updatedAt: purchase.getUpdatedAt(),
    };
  }
}
