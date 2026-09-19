import { DomainException } from '@/domain/shared/exceptions/domain.exception';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { ExperienceId } from '@/domain/experience/value-objects/experience-id.vo';
import { CartId } from '@/domain/cart/value-objects/cart-id.vo';
import { CartItem } from '@/domain/cart/value-objects/cart-item.vo';
import { CartReservationItem } from '@/domain/cart/value-objects/cart-reservation-item.vo';
import { CartStatus, CartStatusEnum } from '@/domain/cart/value-objects/cart-status.vo';
import { CartCreateParams, ICartData } from './cart.types';

export class Cart {
  private constructor(
    private readonly id: CartId | null,
    private readonly guestAccountId: GuestAccountId,
    private experienceItems: CartItem[],
    private reservationItem: CartReservationItem | null,
    private status: CartStatus,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static create(params: CartCreateParams): Cart {
    return new Cart(
      null,
      params.guestAccountId,
      [],
      null,
      CartStatus.open(),
      new Date(),
      new Date(),
    );
  }

  static reconstitute(data: ICartData): Cart {
    return new Cart(
      data.id,
      data.guestAccountId,
      [...data.experienceItems],
      data.reservationItem,
      data.status,
      data.createdAt,
      data.updatedAt,
    );
  }

  addExperienceItem(item: CartItem): void {
    this.assertOpen();
    const idx = this.experienceItems.findIndex((i) =>
      i.matchesKey(item.experienceId, item.selectedDate),
    );
    if (idx >= 0) {
      this.experienceItems[idx] = item;
    } else {
      this.experienceItems.push(item);
    }
    this.touch();
  }

  removeExperienceItem(experienceId: ExperienceId, selectedDate?: Date | null): void {
    this.assertOpen();
    const idx = this.experienceItems.findIndex((i) =>
      i.matchesKey(experienceId, selectedDate),
    );
    if (idx < 0) {
      throw new DomainException('Experience item not found in cart');
    }
    this.experienceItems.splice(idx, 1);
    this.touch();
  }

  setReservationItem(item: CartReservationItem): void {
    this.assertOpen();
    this.reservationItem = item;
    this.touch();
  }

  removeReservationItem(): void {
    this.assertOpen();
    this.reservationItem = null;
    this.touch();
  }

  clear(): void {
    this.assertOpen();
    this.experienceItems = [];
    this.reservationItem = null;
    this.touch();
  }

  clearExperienceItems(): void {
    this.assertOpen();
    this.experienceItems = [];
    this.touch();
  }

  checkout(): void {
    this.assertOpen();
    if (this.experienceItems.length === 0 && !this.reservationItem) {
      throw new DomainException('Cannot checkout an empty cart');
    }
    this.status = CartStatus.create(CartStatusEnum.PENDING_PAYMENT);
    this.touch();
  }

  markPaid(): void {
    this.assertPendingPayment();
    this.status = CartStatus.create(CartStatusEnum.PAID);
    this.touch();
  }

  reopen(): void {
    this.assertPendingPayment();
    this.status = CartStatus.open();
    this.touch();
  }

  getTotalCop(): number {
    const experiencesTotal = this.experienceItems.reduce(
      (sum, item) => sum + item.getTotalCop(),
      0,
    );
    return experiencesTotal + (this.reservationItem?.totalPriceCopSnapshot ?? 0);
  }

  getId(): CartId | null {
    return this.id;
  }

  getGuestAccountId(): GuestAccountId {
    return this.guestAccountId;
  }

  getExperienceItems(): CartItem[] {
    return [...this.experienceItems];
  }

  getReservationItem(): CartReservationItem | null {
    return this.reservationItem;
  }

  getStatus(): CartStatus {
    return this.status;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  private assertOpen(): void {
    if (!this.status.isOpen()) {
      throw new DomainException('Cart is not open');
    }
  }

  private assertPendingPayment(): void {
    if (!this.status.isPendingPayment()) {
      throw new DomainException('Cart is not pending payment');
    }
  }

  private touch(): void {
    this.updatedAt = new Date();
  }
}
