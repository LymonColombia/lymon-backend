import { Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  type TransactionManager,
  TRANSACTION_MANAGER,
} from '@/domain/shared/transaction-manager.interface';
import {
  PAYMENT_SESSION_REPOSITORY,
  type PaymentSessionRepository,
} from '@/domain/payment/repositories/payment-session.repository';
import {
  CART_REPOSITORY,
  type CartRepository,
} from '@/domain/cart/repositories/cart.repository';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepository,
} from '@/domain/reservation/repositories/reservation.repository';
import {
  EXPERIENCE_PURCHASE_REPOSITORY,
  type ExperiencePurchaseRepository,
} from '@/domain/experience-purchase/repositories/experience-purchase.repository';
import { ProcessWompiWebhookCommand } from './process-wompi-webhook.command';
import { ReservationId } from '@/domain/reservation/value-objects/reservation-id.vo';
import { ReservationStatusEnum } from '@/domain/reservation/value-objects/reservation-status.vo';
import { ExperiencePurchase } from '@/domain/experience-purchase/entities/experience-purchase.entity';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { ExperienceId } from '@/domain/experience/value-objects/experience-id.vo';

@CommandHandler(ProcessWompiWebhookCommand)
export class ProcessWompiWebhookHandler implements ICommandHandler<ProcessWompiWebhookCommand> {
  constructor(
    @Inject(TRANSACTION_MANAGER)
    private readonly transactionManager: TransactionManager,
    @Inject(PAYMENT_SESSION_REPOSITORY)
    private readonly paymentSessionRepository: PaymentSessionRepository,
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartRepository,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepository,
    @Inject(EXPERIENCE_PURCHASE_REPOSITORY)
    private readonly experiencePurchaseRepository: ExperiencePurchaseRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(command: ProcessWompiWebhookCommand): Promise<void> {
    const payload = command.payload;
    if (payload.event !== 'transaction.updated') {
      return;
    }

    const transaction = payload.data.transaction;
    const reference = transaction.reference?.trim();
    if (!reference) {
      return;
    }

    const session =
      await this.paymentSessionRepository.findByReference(reference);
    if (!session || !session.getStatus().isPending()) {
      return;
    }

    if (
      session.getAmountInCents() !== transaction.amount_in_cents ||
      session.getCurrency() !== transaction.currency
    ) {
      return;
    }

    switch (transaction.status) {
      case 'APPROVED':
        await this.handleApprovedSession(session, transaction.id);
        return;
      case 'DECLINED':
      case 'ERROR':
        session.decline(transaction.id);
        await this.paymentSessionRepository.save(session);
        await this.handleFailedSession(session);
        return;
      case 'VOIDED':
        session.cancel(transaction.id);
        await this.paymentSessionRepository.save(session);
        await this.handleFailedSession(session);
        return;
      case 'EXPIRED':
        session.expire(transaction.id);
        await this.paymentSessionRepository.save(session);
        await this.handleFailedSession(session);
        return;
      default:
        return;
    }
  }

  private async handleApprovedSession(
    session: Awaited<
      ReturnType<PaymentSessionRepository['findByReference']>
    > extends infer T
      ? Exclude<T, null>
      : never,
    providerReference: string,
  ): Promise<void> {
    await this.transactionManager.executeInTransaction(async (context) => {
      session.approve(providerReference);
      await this.paymentSessionRepository.save(session, context.getContext());

      const cart = await this.cartRepository.findById(session.getCartId());
      if (!cart) {
        throw new NotFoundException(
          'Cart not found for approved payment session',
        );
      }

      const reservationItem = cart.getReservationItem();
      if (reservationItem?.reservationId) {
        const reservation = await this.reservationRepository.findById(
          ReservationId.create(reservationItem.reservationId),
        );
        if (!reservation) {
          throw new NotFoundException(
            'Reservation not found for approved payment session',
          );
        }

        if (
          reservation.getStatus().getValue() === ReservationStatusEnum.PENDING
        ) {
          reservation.confirm();
        }

        await this.reservationRepository.save(
          reservation,
          context.getContext(),
        );
      }

      for (const item of cart.getExperienceItems()) {
        const purchase = ExperiencePurchase.create({
          tenantId: TenantId.createFromString(item.tenantId),
          guestAccountId: GuestAccountId.createFromString(
            session.getGuestAccountId().toString(),
          ),
          experienceId: ExperienceId.create(item.experienceId.toString()),
          reservationId: item.reservationId,
          selectedDate: item.selectedDate,
          quantity: item.quantity,
          unitPriceCop: item.unitPriceCopSnapshot,
        });
        purchase.confirm(session.getReference());
        await this.experiencePurchaseRepository.save(
          purchase,
          context.getContext(),
        );
      }

      if (cart.getStatus().isPendingPayment()) {
        cart.markPaid();
        await this.cartRepository.save(cart);
      }

      this.eventEmitter.emit('wompi.payment.approved', {
        reference: session.getReference(),
        providerReference,
      });
    });
  }

  private async handleFailedSession(
    session: Awaited<
      ReturnType<PaymentSessionRepository['findByReference']>
    > extends infer T
      ? Exclude<T, null>
      : never,
  ): Promise<void> {
    const cart = await this.cartRepository.findById(session.getCartId());
    if (!cart) {
      return;
    }

    const reservationItem = cart.getReservationItem();
    if (reservationItem?.reservationId) {
      const reservation = await this.reservationRepository.findById(
        ReservationId.create(reservationItem.reservationId),
      );
      if (
        reservation &&
        reservation.getStatus().getValue() === ReservationStatusEnum.PENDING
      ) {
        reservation.cancel('Payment failed');
        await this.reservationRepository.save(reservation);
      }
    }

    if (cart.getStatus().isPendingPayment()) {
      cart.reopen();
      await this.cartRepository.save(cart);
    }
  }
}
