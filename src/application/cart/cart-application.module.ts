import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PersistenceModule } from '@/infrastructure/persistence/persistence.module';
import { AddExperienceToCartHandler } from '@/application/cart/commands/add-experience-to-cart/add-experience-to-cart.handler';
import { RemoveExperienceFromCartHandler } from '@/application/cart/commands/remove-experience-from-cart/remove-experience-from-cart.handler';
import { SetCartReservationHandler } from '@/application/cart/commands/set-cart-reservation/set-cart-reservation.handler';
import { RemoveCartReservationHandler } from '@/application/cart/commands/remove-cart-reservation/remove-cart-reservation.handler';
import { ClearCartHandler } from '@/application/cart/commands/clear-cart/clear-cart.handler';
import { CheckoutCartHandler } from '@/application/cart/commands/checkout-cart/checkout-cart.handler';
import { GetGuestCartHandler } from '@/application/cart/queries/get-guest-cart/get-guest-cart.handler';
import { PaymentModule } from '@/infrastructure/payment/payment.module';

const CommandHandlers = [
  AddExperienceToCartHandler,
  RemoveExperienceFromCartHandler,
  SetCartReservationHandler,
  RemoveCartReservationHandler,
  ClearCartHandler,
  CheckoutCartHandler,
];

const QueryHandlers = [GetGuestCartHandler];

@Module({
  imports: [CqrsModule, PersistenceModule, PaymentModule],
  providers: [...CommandHandlers, ...QueryHandlers],
  exports: [...CommandHandlers, ...QueryHandlers],
})
export class CartApplicationModule {}
