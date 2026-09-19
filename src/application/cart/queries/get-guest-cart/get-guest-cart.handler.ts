import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetGuestCartQuery } from './get-guest-cart.query';
import {
  CART_REPOSITORY,
  type CartRepository,
} from '@/domain/cart/repositories/cart.repository';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';

export interface CartItemResult {
  experienceId: string;
  experienceName: string;
  selectedDate: Date | null;
  quantity: number;
  unitPriceCop: number;
  totalPriceCop: number;
  reservationId: string | null;
}

export interface GuestCartResult {
  cartId: string | null;
  status: string;
  experienceItems: CartItemResult[];
  reservationItem: {
    propertyId: string;
    unitId: string;
    checkIn: Date;
    checkOut: Date;
    guestsCount: number;
    notes: string | null;
    pricePerNight: number;
    totalPriceCop: number;
    reservationId: string | null;
  } | null;
  totalCop: number;
  createdAt: Date;
  updatedAt: Date;
}

@QueryHandler(GetGuestCartQuery)
export class GetGuestCartHandler implements IQueryHandler<GetGuestCartQuery> {
  constructor(
    @Inject(CART_REPOSITORY)
    private readonly cartRepository: CartRepository,
  ) {}

  async execute(query: GetGuestCartQuery): Promise<GuestCartResult | null> {
    const cart = await this.cartRepository.findByGuestAccountId(
      GuestAccountId.createFromString(query.guestAccountId),
    );
    if (!cart || cart.getStatus().isPaid()) return null;

    const reservationItem = cart.getReservationItem();

    return {
      cartId: cart.getId()?.toString() ?? null,
      status: cart.getStatus().toString(),
      experienceItems: cart.getExperienceItems().map((item) => ({
        experienceId: item.experienceId.toString(),
        experienceName: item.experienceName,
        selectedDate: item.selectedDate,
        quantity: item.quantity,
        unitPriceCop: item.unitPriceCopSnapshot,
        totalPriceCop: item.getTotalCop(),
        reservationId: item.reservationId,
      })),
      reservationItem: reservationItem
        ? {
            propertyId: reservationItem.propertyId,
            unitId: reservationItem.unitId,
            checkIn: reservationItem.checkIn,
            checkOut: reservationItem.checkOut,
            guestsCount: reservationItem.guestsCount,
            notes: reservationItem.notes,
            pricePerNight: reservationItem.pricePerNight,
            totalPriceCop: reservationItem.totalPriceCopSnapshot,
            reservationId: reservationItem.reservationId,
          }
        : null,
      totalCop: cart.getTotalCop(),
      createdAt: cart.getCreatedAt(),
      updatedAt: cart.getUpdatedAt(),
    };
  }
}
