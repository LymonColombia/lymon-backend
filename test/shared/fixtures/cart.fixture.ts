import { Cart } from '@/domain/cart/entities/cart.entity';
import { CartId } from '@/domain/cart/value-objects/cart-id.vo';
import { CartItem } from '@/domain/cart/value-objects/cart-item.vo';
import { CartReservationItem } from '@/domain/cart/value-objects/cart-reservation-item.vo';
import {
  CartStatus,
  CartStatusEnum,
} from '@/domain/cart/value-objects/cart-status.vo';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { ExperienceId } from '@/domain/experience/value-objects/experience-id.vo';

export const CART_FIXTURE_DEFAULTS = {
  id: '65f1a1a2-b3c4-d5e6-f7a8-bb0100000000',
  tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000',
  guestAccountId: '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
  status: CartStatusEnum.OPEN,
  createdAt: new Date('2030-01-01T10:00:00Z'),
  updatedAt: new Date('2030-01-01T10:00:00Z'),
};

export function makeCart(
  overrides?: Partial<{
    id: string;
    guestAccountId: string;
    status: CartStatusEnum;
    experienceItems: CartItem[];
    reservationItem: CartReservationItem | null;
    createdAt: Date;
    updatedAt: Date;
  }>,
): Cart {
  const merged = { ...CART_FIXTURE_DEFAULTS, ...overrides };
  return Cart.reconstitute({
    id: CartId.createFromString(merged.id),
    guestAccountId: GuestAccountId.createFromString(merged.guestAccountId),
    experienceItems: merged.experienceItems ?? [],
    reservationItem: merged.reservationItem ?? null,
    status: CartStatus.create(merged.status),
    createdAt: merged.createdAt,
    updatedAt: merged.updatedAt,
  });
}

export function makeCartItem(
  overrides?: Partial<{
    tenantId: string;
    tenantId: string;
    experienceId: string;
    experienceName: string;
    selectedDate: Date | null;
    quantity: number;
    unitPriceCopSnapshot: number;
    reservationId: string | null;
  }>,
): CartItem {
  return CartItem.create({
    tenantId: overrides?.tenantId ?? '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000',
    experienceId: ExperienceId.create(
      overrides?.experienceId ?? '65f1a1a2-b3c4-d5e6-f7a8-bb1000000000',
    ),
    experienceName: overrides?.experienceName ?? 'Test Experience',
    selectedDate: overrides?.selectedDate ?? null,
    quantity: overrides?.quantity ?? 1,
    unitPriceCopSnapshot: overrides?.unitPriceCopSnapshot ?? 50000,
    reservationId: overrides?.reservationId ?? null,
  });
}
