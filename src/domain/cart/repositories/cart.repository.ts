import { Cart } from '@/domain/cart/entities/cart.entity';
import { CartId } from '@/domain/cart/value-objects/cart-id.vo';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';

export const CART_REPOSITORY = 'CART_REPOSITORY';

export interface CartRepository {
  save(cart: Cart): Promise<string>;
  findById(id: CartId): Promise<Cart | null>;
  findOpenByGuest(guestAccountId: GuestAccountId): Promise<Cart | null>;
  findByGuestAccountId(guestAccountId: GuestAccountId): Promise<Cart | null>;
  findPendingPaymentCartsOlderThan(date: Date): Promise<Cart[]>;
}
