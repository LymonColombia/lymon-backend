import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'node:crypto';
import { CheckoutCartCommand } from './checkout-cart.command';
import {
  CART_REPOSITORY,
  type CartRepository,
} from '@/domain/cart/repositories/cart.repository';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepository,
} from '@/domain/reservation/repositories/reservation.repository';
import {
  GUEST_REPOSITORY,
  type GuestRepository,
} from '@/domain/guest/repositories/guest.repository';
import {
  GUEST_ACCOUNT_REPOSITORY,
  type GuestAccountRepository,
} from '@/domain/guest-account/repositories/guest-account.repository';
import {
  UNIT_REPOSITORY,
  type UnitRepository,
} from '@/domain/unit/repositories/unit.repository';
import {
  EXPERIENCE_REPOSITORY,
  type ExperienceRepository,
} from '@/domain/experience/repositories/experience.repository';
import {
  EXPERIENCE_PURCHASE_REPOSITORY,
  type ExperiencePurchaseRepository,
} from '@/domain/experience-purchase/repositories/experience-purchase.repository';
import {
  PAYMENT_SESSION_REPOSITORY,
  type PaymentSessionRepository,
} from '@/domain/payment/repositories/payment-session.repository';
import { ExperienceCapacityChecker } from '@/domain/experience-purchase/services/experience-capacity-checker.domain-service';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { ExperienceId } from '@/domain/experience/value-objects/experience-id.vo';
import { ReservationId } from '@/domain/reservation/value-objects/reservation-id.vo';
import { ReservationStatusEnum } from '@/domain/reservation/value-objects/reservation-status.vo';
import { ExperienceStatusEnum } from '@/domain/experience/value-objects/experience-status.vo';
import {
  ReservationSource,
  ReservationSourceEnum,
} from '@/domain/reservation/value-objects/reservation-source.vo';
import { DateRange } from '@/domain/reservation/value-objects/date-range.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { Cart } from '@/domain/cart/entities/cart.entity';
import { CartItem } from '@/domain/cart/value-objects/cart-item.vo';
import { CartReservationItem } from '@/domain/cart/value-objects/cart-reservation-item.vo';
import { Guest } from '@/domain/guest/entities/guest.entity';
import { Reservation } from '@/domain/reservation/entities/reservation.entity';
import { DomainException } from '@/domain/shared/exceptions/domain.exception';
import { PaymentSession } from '@/domain/payment/entities/payment-session.entity';
import { AvailabilityChecker } from '@/domain/reservation/services/availability-checker.domain-service';
import {
  PAYMENT_GATEWAY,
  type IPaymentGateway,
  type PaymentCheckoutResponse,
} from '@/domain/shared/payment-gateway.interface';
import {
  AuditAction,
  AuditEntityType,
} from '@/domain/audit/value-objects/audit-action.vo';
import {
  AuditLoggedEvent,
  AUDIT_LOG_EVENT,
} from '@/infrastructure/audit/events/audit-logged.event';

@CommandHandler(CheckoutCartCommand)
export class CheckoutCartHandler implements ICommandHandler<CheckoutCartCommand> {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartRepository,
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepository,
    @Inject(GUEST_REPOSITORY)
    private readonly guestRepository: GuestRepository,
    @Inject(GUEST_ACCOUNT_REPOSITORY)
    private readonly guestAccountRepository: GuestAccountRepository,
    @Inject(UNIT_REPOSITORY)
    private readonly unitRepository: UnitRepository,
    @Inject(EXPERIENCE_REPOSITORY)
    private readonly experienceRepository: ExperienceRepository,
    @Inject(EXPERIENCE_PURCHASE_REPOSITORY)
    private readonly experiencePurchaseRepository: ExperiencePurchaseRepository,
    @Inject(PAYMENT_SESSION_REPOSITORY)
    private readonly paymentSessionRepository: PaymentSessionRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(
    command: CheckoutCartCommand,
  ): Promise<PaymentCheckoutResponse> {
    const guestAccountId = GuestAccountId.createFromString(
      command.guestAccountId,
    );

    const cart = await this.cartRepository.findOpenByGuest(guestAccountId);
    if (!cart) {
      throw new NotFoundException('No open cart found');
    }

    // Update cart with frontend data (source of truth)
    await this.updateCartFromFrontend(cart, command);

    if (cart.getExperienceItems().length === 0 && !cart.getReservationItem()) {
      throw new DomainException('Cannot checkout an empty cart');
    }

    const tenantId = this.resolveTenantId(cart);
    const guest = await this.prepareGuestAndReservation(
      cart,
      tenantId,
      command,
    );

    for (const item of cart.getExperienceItems()) {
      await this.validateExperienceItem(item);
    }

    // Expire any existing pending session for this cart
    const existingSession =
      await this.paymentSessionRepository.findPendingByCartId(cart.getId()!);
    if (existingSession) {
      existingSession.expire('Replaced by new checkout');
      await this.paymentSessionRepository.save(existingSession);
    }

    const reference = this.buildPaymentReference(cart.getId()!.toString());

    const cartTotalCop = cart.getTotalCop();

    const checkoutPayload = await this.paymentGateway.buildCheckoutPayload({
      reference,
      amountInCents: cartTotalCop * 100,
      currency: 'COP',
      customerData: {
        email: guest?.getPrimaryEmail() ?? command.actorEmail,
        fullName: guest?.getFullName() ?? null,
      },
    });

    const paymentSession = PaymentSession.create({
      tenantId,
      guestAccountId,
      cartId: cart.getId()!,
      reference: checkoutPayload.reference,
      amountInCents: checkoutPayload.amountInCents,
      currency: checkoutPayload.currency,
      publicKey: checkoutPayload.publicKey,
      signatureIntegrity: checkoutPayload.signatureIntegrity,
      redirectUrl: checkoutPayload.redirectUrl ?? null,
      expirationTime: checkoutPayload.expirationTime ?? null,
    });

    await this.paymentSessionRepository.save(paymentSession);

    cart.checkout();
    await this.cartRepository.save(cart);

    this.eventEmitter.emit(
      AUDIT_LOG_EVENT,
      new AuditLoggedEvent(
        tenantId.toString(),
        command.actorId,
        command.actorEmail,
        AuditAction.CART_CHECKED_OUT,
        AuditEntityType.CART,
        cart.getId()!.toString(),
        {
          reference: checkoutPayload.reference,
          amountInCents: checkoutPayload.amountInCents,
          currency: checkoutPayload.currency,
        },
      ),
    );

    return checkoutPayload;
  }

  private async updateCartFromFrontend(
    cart: Cart,
    command: CheckoutCartCommand,
  ): Promise<void> {
    // Update reservation item from frontend
    if (command.reservationItem) {
      const item = command.reservationItem;
      const unit = await this.unitRepository.findById(UnitId.create(item.unitId));
      if (!unit) {
        throw new NotFoundException('Unit not found');
      }

      const dateRange = DateRange.create(item.checkIn, item.checkOut);
      const existingReservations =
        await this.reservationRepository.findByUnitAndDateRange(
          UnitId.create(item.unitId),
          dateRange,
        );

      if (
        !AvailabilityChecker.isAvailable(
          dateRange,
          existingReservations,
          unit.getInventoryCount(),
        )
      ) {
        throw new DomainException(
          'Unit is not available for the requested dates',
        );
      }

      const nights = dateRange.nights();
      const totalPrice = item.pricePerNight * nights;

      cart.setReservationItem(
        CartReservationItem.create({
          tenantId: item.tenantId,
          propertyId: item.propertyId,
          unitId: item.unitId,
          checkIn: item.checkIn,
          checkOut: item.checkOut,
          guestsCount: item.guestsCount,
          notes: item.notes,
          pricePerNight: item.pricePerNight,
          totalPriceCopSnapshot: totalPrice,
          reservationId: null,
        }),
      );
    }

    // Update experience items from frontend
    if (command.experienceItems) {
      cart.clearExperienceItems();

      for (const exp of command.experienceItems) {
        const experience = await this.experienceRepository.findById(
          ExperienceId.create(exp.experienceId),
        );
        if (!experience) {
          throw new NotFoundException(
            `Experience ${exp.experienceId} not found`,
          );
        }
        if (experience.getStatus().toString() !== ExperienceStatusEnum.ACTIVE) {
          throw new DomainException(
            `Experience '${experience.getName()}' is not available for purchase`,
          );
        }

        const cartItem = CartItem.create({
          tenantId: exp.tenantId,
          experienceId: ExperienceId.create(exp.experienceId),
          experienceName: experience.getName(),
          selectedDate: exp.selectedDate,
          quantity: exp.quantity,
          unitPriceCopSnapshot: experience.getPriceCop(),
          reservationId: null,
        });

        cart.addExperienceItem(cartItem);
      }
    }

    await this.cartRepository.save(cart);
  }

  private async prepareGuestAndReservation(
    cart: Cart,
    tenantId: TenantId,
    command: CheckoutCartCommand,
  ): Promise<Guest | null> {
    const reservationItem = cart.getReservationItem();
    if (!reservationItem) {
      return null;
    }

    const guestAccountId = GuestAccountId.createFromString(
      command.guestAccountId,
    );

    let guest = await this.guestRepository.findByGuestAccountId(
      tenantId,
      guestAccountId,
    );
    if (!guest) {
      const guestId = await this.resolveGuestId(
        tenantId,
        guestAccountId,
        command.actorEmail,
      );
      guest = await this.guestRepository.findById(guestId);
      if (!guest) {
        throw new NotFoundException('Guest profile not found');
      }
    }

    if (reservationItem.reservationId) {
      const reservation = await this.reservationRepository.findById(
        ReservationId.create(reservationItem.reservationId),
      );
      if (
        reservation &&
        reservation.getStatus().getValue() === ReservationStatusEnum.PENDING
      ) {
        return guest;
      }
    }

    const guestId = guest.getId()!;
    const newReservation = await this.buildReservationFromDraft(
      reservationItem,
      guestId,
      tenantId,
    );
    const newReservationId =
      await this.reservationRepository.save(newReservation);

    cart.setReservationItem(
      reservationItem.withReservationId(newReservationId),
    );
    await this.cartRepository.save(cart);

    return guest;
  }

  private async resolveGuestId(
    tenantId: TenantId,
    guestAccountId: GuestAccountId,
    actorEmail: string,
  ): Promise<GuestId> {
    const existing = await this.guestRepository.findByGuestAccountId(
      tenantId,
      guestAccountId,
    );
    if (existing) {
      return existing.getId()!;
    }

    const account = await this.guestAccountRepository.findById(guestAccountId);
    if (!account) {
      throw new NotFoundException('Guest account not found');
    }

    const newProfile = Guest.create({
      tenantId,
      guestAccountId,
      fullName: account.getFullName(),
      firstName: account.getFirstName() ?? undefined,
      lastName: account.getLastName() ?? undefined,
      primaryEmail: actorEmail,
      identity: {},
    });

    const savedId = await this.guestRepository.save(newProfile);
    return GuestId.createFromString(savedId);
  }

  private async buildReservationFromDraft(
    item: CartReservationItem,
    guestId: GuestId,
    tenantId: TenantId,
  ): Promise<Reservation> {
    const unit = await this.unitRepository.findById(UnitId.create(item.unitId));
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }

    const dateRange = DateRange.reconstitute(item.checkIn, item.checkOut);
    const existingReservations =
      await this.reservationRepository.findByUnitAndDateRange(
        UnitId.create(item.unitId),
        dateRange,
      );

    if (
      !AvailabilityChecker.isAvailable(
        dateRange,
        existingReservations,
        unit.getInventoryCount(),
      )
    ) {
      throw new DomainException(
        'Unit is no longer available for the requested dates',
      );
    }

    return Reservation.create({
      tenantId,
      propertyId: PropertyId.create(item.propertyId),
      unitId: UnitId.create(item.unitId),
      guestId,
      dateRange,
      source: ReservationSource.create(ReservationSourceEnum.DIRECT),
      guestsCount: item.guestsCount,
      pricePerNight: item.pricePerNight,
      notes: item.notes,
    });
  }

  private async validateExperienceItem(item: CartItem): Promise<void> {
    const experience = await this.experienceRepository.findById(
      ExperienceId.create(item.experienceId.toString()),
    );
    if (!experience) {
      throw new NotFoundException(
        `Experience ${item.experienceId.toString()} not found`,
      );
    }
    if (experience.getStatus().toString() !== ExperienceStatusEnum.ACTIVE) {
      throw new DomainException(
        `Experience '${experience.getName()}' is no longer active`,
      );
    }

    const hasReservation = !!item.reservationId;
    if (hasReservation && !experience.getAllowReservationPurchase()) {
      throw new DomainException(
        `Experience '${experience.getName()}' cannot be purchased as a reservation add-on`,
      );
    }
    if (!hasReservation && !experience.getAllowStandalonePurchase()) {
      throw new DomainException(
        `Experience '${experience.getName()}' cannot be purchased standalone`,
      );
    }

    const confirmedCount =
      await this.experiencePurchaseRepository.countConfirmedByExperienceAndDate(
        item.experienceId.toString(),
        item.selectedDate,
      );
    ExperienceCapacityChecker.check(experience, item.quantity, confirmedCount);
  }

  private resolveTenantId(cart: {
    getReservationItem(): CartReservationItem | null;
    getExperienceItems(): CartItem[];
  }): TenantId {
    const reservationItem = cart.getReservationItem();
    if (reservationItem) {
      return TenantId.createFromString(reservationItem.tenantId);
    }

    const firstExperienceItem = cart.getExperienceItems()[0];
    if (!firstExperienceItem) {
      throw new DomainException('Cannot resolve tenant for empty checkout');
    }

    return TenantId.createFromString(firstExperienceItem.tenantId);
  }

  private toCheckoutResponse(
    paymentSession: PaymentSession,
    guest: Guest | null,
    fallbackEmail: string,
  ): PaymentCheckoutResponse {
    return {
      publicKey: paymentSession.getPublicKey(),
      reference: paymentSession.getReference(),
      amountInCents: paymentSession.getAmountInCents(),
      currency: paymentSession.getCurrency(),
      signatureIntegrity: paymentSession.getSignatureIntegrity(),
      redirectUrl: paymentSession.getRedirectUrl(),
      expirationTime: paymentSession.getExpirationTime(),
      customerData: {
        email: guest?.getPrimaryEmail() ?? fallbackEmail,
        fullName: guest?.getFullName() ?? null,
      },
    };
  }

  private buildPaymentReference(cartId: string): string {
    return `checkout_${cartId}_${randomUUID()}`;
  }
}
