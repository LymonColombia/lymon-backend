import { Injectable } from '@nestjs/common';
import { Cart } from '@/domain/cart/entities/cart.entity';
import { CartItem } from '@/domain/cart/value-objects/cart-item.vo';
import { CartReservationItem } from '@/domain/cart/value-objects/cart-reservation-item.vo';
import { CartId } from '@/domain/cart/value-objects/cart-id.vo';
import {
  CartStatus,
  CartStatusEnum,
} from '@/domain/cart/value-objects/cart-status.vo';
import { CartRepository } from '@/domain/cart/repositories/cart.repository';
import { ExperienceId } from '@/domain/experience/value-objects/experience-id.vo';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import {
  Prisma,
  type carts as CartRow,
} from '@/infrastructure/persistence/prisma/generated/client';

/** Shapes of the two jsonb columns; the ids are plain strings in the document. */
interface StoredExperienceItem {
  tenantId: string;
  experienceId: string;
  experienceName: string;
  selectedDate: string | Date | null;
  quantity: number;
  unitPriceCopSnapshot: number;
  reservationId: string | null;
}

interface StoredReservationItem {
  tenantId: string;
  propertyId: string;
  unitId: string;
  checkIn: string | Date;
  checkOut: string | Date;
  guestsCount: number;
  notes: string | null;
  pricePerNight: number;
  totalPriceCopSnapshot: number;
  reservationId: string | null;
}

const toDate = (value: string | Date): Date =>
  value instanceof Date ? value : new Date(value);

@Injectable()
export class PrismaCartRepository implements CartRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(cart: Cart): Promise<string> {
    const id = cart.getId()?.toString();
    const reservationItem = cart.getReservationItem();

    const data = {
      status: cart.getStatus().toString(),
      experience_items: cart.getExperienceItems().map(
        (item): StoredExperienceItem => ({
          tenantId: item.tenantId,
          experienceId: item.experienceId.toString(),
          experienceName: item.experienceName,
          selectedDate: item.selectedDate ?? null,
          quantity: item.quantity,
          unitPriceCopSnapshot: item.unitPriceCopSnapshot,
          reservationId: item.reservationId ?? null,
        }),
      ) as unknown as Prisma.InputJsonValue,
      reservation_item: reservationItem
        ? ({
            tenantId: reservationItem.tenantId,
            propertyId: reservationItem.propertyId,
            unitId: reservationItem.unitId,
            checkIn: reservationItem.checkIn,
            checkOut: reservationItem.checkOut,
            guestsCount: reservationItem.guestsCount,
            notes: reservationItem.notes,
            pricePerNight: reservationItem.pricePerNight,
            totalPriceCopSnapshot: reservationItem.totalPriceCopSnapshot,
            reservationId: reservationItem.reservationId ?? null,
          } as unknown as Prisma.InputJsonValue)
        : Prisma.DbNull,
      updated_at: new Date(),
    };

    if (id) {
      await this.prisma.carts.update({ where: { id }, data });
      return id;
    }

    // one cart row per guest account, whatever its status — same as the mongo version
    const existing = await this.prisma.carts.findFirst({
      where: { guest_account_id: cart.getGuestAccountId().toString() },
      select: { id: true },
    });

    if (existing) {
      await this.prisma.carts.update({ where: { id: existing.id }, data });
      return existing.id;
    }

    const created = await this.prisma.carts.create({
      data: { ...data, guest_account_id: cart.getGuestAccountId().toString() },
    });
    return created.id;
  }

  async findById(id: CartId): Promise<Cart | null> {
    const row = await this.prisma.carts.findUnique({
      where: { id: id.toString() },
    });
    return row ? this.toDomainEntity(row) : null;
  }

  async findOpenByGuest(guestAccountId: GuestAccountId): Promise<Cart | null> {
    const row = await this.prisma.carts.findFirst({
      where: {
        guest_account_id: guestAccountId.toString(),
        status: CartStatusEnum.OPEN,
      },
    });
    return row ? this.toDomainEntity(row) : null;
  }

  async findByGuestAccountId(
    guestAccountId: GuestAccountId,
  ): Promise<Cart | null> {
    const row = await this.prisma.carts.findFirst({
      where: { guest_account_id: guestAccountId.toString() },
      orderBy: { created_at: 'desc' },
    });
    return row ? this.toDomainEntity(row) : null;
  }

  async findPendingPaymentCartsOlderThan(date: Date): Promise<Cart[]> {
    const rows = await this.prisma.carts.findMany({
      where: {
        status: CartStatusEnum.PENDING_PAYMENT,
        updated_at: { lt: date },
      },
    });
    return rows.map((row) => this.toDomainEntity(row));
  }

  private toDomainEntity(row: CartRow): Cart {
    const experienceItems =
      (row.experience_items as unknown as StoredExperienceItem[]) ?? [];
    const reservationItem =
      row.reservation_item as unknown as StoredReservationItem | null;

    return Cart.reconstitute({
      id: CartId.createFromString(row.id),
      guestAccountId: GuestAccountId.createFromString(row.guest_account_id),
      experienceItems: experienceItems.map((item) =>
        CartItem.create({
          tenantId: item.tenantId,
          experienceId: ExperienceId.create(item.experienceId),
          experienceName: item.experienceName,
          selectedDate: item.selectedDate ? toDate(item.selectedDate) : null,
          quantity: item.quantity,
          unitPriceCopSnapshot: item.unitPriceCopSnapshot,
          reservationId: item.reservationId,
        }),
      ),
      reservationItem: reservationItem
        ? CartReservationItem.create({
            tenantId: reservationItem.tenantId,
            propertyId: reservationItem.propertyId,
            unitId: reservationItem.unitId,
            checkIn: toDate(reservationItem.checkIn),
            checkOut: toDate(reservationItem.checkOut),
            guestsCount: reservationItem.guestsCount,
            notes: reservationItem.notes,
            pricePerNight: reservationItem.pricePerNight,
            totalPriceCopSnapshot: reservationItem.totalPriceCopSnapshot,
            reservationId: reservationItem.reservationId,
          })
        : null,
      status: CartStatus.create(row.status as CartStatusEnum),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
