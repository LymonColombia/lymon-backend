import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  CART_REPOSITORY,
  type CartRepository,
} from '@/domain/cart/repositories/cart.repository';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepository,
} from '@/domain/reservation/repositories/reservation.repository';
import {
  PAYMENT_SESSION_REPOSITORY,
  type PaymentSessionRepository,
} from '@/domain/payment/repositories/payment-session.repository';
import { ReservationId } from '@/domain/reservation/value-objects/reservation-id.vo';
import { CartId } from '@/domain/cart/value-objects/cart-id.vo';

@Injectable()
export class ExpirePendingReservationsScheduler {
  private readonly logger = new Logger(
    ExpirePendingReservationsScheduler.name,
  );

  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartRepository,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepository,
    @Inject(PAYMENT_SESSION_REPOSITORY)
    private readonly paymentSessionRepository: PaymentSessionRepository,
  ) {}

  @Cron('*/5 * * * *') // every 5 minutes
  async expireStaleReservations(): Promise<void> {
    const cutoff = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
    this.logger.log(
      `Checking for stale pending reservations older than ${cutoff.toISOString()}`,
    );

    const carts =
      await this.cartRepository.findPendingPaymentCartsOlderThan(cutoff);

    let cancelled = 0;
    let reopened = 0;

    for (const cart of carts) {
      const pendingSession =
        await this.paymentSessionRepository.findPendingByCartId(
          cart.getId()!,
        );
      if (pendingSession) {
        continue; // still has an active payment session
      }

      const reservationItem = cart.getReservationItem();
      if (reservationItem?.reservationId) {
        const reservation = await this.reservationRepository.findById(
          ReservationId.create(reservationItem.reservationId),
        );
        if (
          reservation &&
          reservation.getStatus().getValue() === 'PENDING'
        ) {
          reservation.cancel('Expired: no payment initiated');
          await this.reservationRepository.save(reservation);
          cancelled++;
        }
      }

      if (cart.getStatus().isPendingPayment()) {
        cart.reopen();
        await this.cartRepository.save(cart);
        reopened++;
      }
    }

    this.logger.log(
      `Expired reservations complete: ${cancelled} cancelled, ${reopened} carts reopened`,
    );
  }
}
