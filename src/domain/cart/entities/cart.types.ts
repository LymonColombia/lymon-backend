import { CartId } from '@/domain/cart/value-objects/cart-id.vo';
import { CartItem } from '@/domain/cart/value-objects/cart-item.vo';
import { CartReservationItem } from '@/domain/cart/value-objects/cart-reservation-item.vo';
import { CartStatus } from '@/domain/cart/value-objects/cart-status.vo';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';

export interface CartCreateParams {
  guestAccountId: GuestAccountId;
}

export interface ICartData {
  id: CartId;
  guestAccountId: GuestAccountId;
  experienceItems: CartItem[];
  reservationItem: CartReservationItem | null;
  status: CartStatus;
  createdAt: Date;
  updatedAt: Date;
}
