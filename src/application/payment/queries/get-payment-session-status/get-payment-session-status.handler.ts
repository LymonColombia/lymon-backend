import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  PAYMENT_SESSION_REPOSITORY,
  type PaymentSessionRepository,
} from '@/domain/payment/repositories/payment-session.repository';
import { GetPaymentSessionStatusQuery } from './get-payment-session-status.query';

export interface GetPaymentSessionStatusResult {
  reference: string;
  status: string;
  amountInCents: number;
  currency: 'COP';
  providerReference: string | null;
  updatedAt: Date;
  isTerminal: boolean;
}

@QueryHandler(GetPaymentSessionStatusQuery)
export class GetPaymentSessionStatusHandler implements IQueryHandler<
  GetPaymentSessionStatusQuery,
  GetPaymentSessionStatusResult
> {
  constructor(
    @Inject(PAYMENT_SESSION_REPOSITORY)
    private readonly paymentSessionRepository: PaymentSessionRepository,
  ) {}

  async execute(
    query: GetPaymentSessionStatusQuery,
  ): Promise<GetPaymentSessionStatusResult> {
    const session = await this.paymentSessionRepository.findByReference(
      query.reference,
    );

    if (
      !session ||
      session.getGuestAccountId().toString() !== query.guestAccountId
    ) {
      throw new NotFoundException('Checkout session not found');
    }

    return {
      reference: session.getReference(),
      status: session.getStatus().toString(),
      amountInCents: session.getAmountInCents(),
      currency: session.getCurrency(),
      providerReference: session.getProviderReference(),
      updatedAt: session.getUpdatedAt(),
      isTerminal: session.getStatus().isTerminal(),
    };
  }
}
