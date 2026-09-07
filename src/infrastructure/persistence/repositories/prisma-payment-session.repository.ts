import { Injectable } from '@nestjs/common';
import { CartId } from '@/domain/cart/value-objects/cart-id.vo';
import { PaymentSession } from '@/domain/payment/entities/payment-session.entity';
import { PaymentSessionStatusEnum } from '@/domain/payment/value-objects/payment-session-status.vo';
import { PaymentSessionRepository } from '@/domain/payment/repositories/payment-session.repository';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { TransactionContextData } from '@/domain/shared/transaction-manager.interface';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import {
  Prisma,
  type payment_sessions as PaymentSessionRow,
} from '@/infrastructure/persistence/prisma/generated/client';

@Injectable()
export class PrismaPaymentSessionRepository
  implements PaymentSessionRepository
{
  constructor(private readonly prisma: PrismaService) {}

  private client(context?: TransactionContextData) {
    return (context as Prisma.TransactionClient | undefined) ?? this.prisma;
  }

  async save(
    session: PaymentSession,
    ctx?: TransactionContextData,
  ): Promise<string> {
    const db = this.client(ctx);
    const id = session.getId()?.toString();

    const data = {
      reference: session.getReference(),
      amount_in_cents: BigInt(session.getAmountInCents()),
      currency: session.getCurrency(),
      public_key: session.getPublicKey(),
      signature_integrity: session.getSignatureIntegrity(),
      redirect_url: session.getRedirectUrl(),
      expiration_time: session.getExpirationTime(),
      provider_reference: session.getProviderReference(),
      status: session.getStatus().toString(),
      updated_at: session.getUpdatedAt(),
    };

    if (id) {
      await db.payment_sessions.update({ where: { id }, data });
      return id;
    }

    const created = await db.payment_sessions.create({
      data: {
        ...data,
        tenant_id: session.getTenantId().toString(),
        guest_account_id: session.getGuestAccountId().toString(),
        cart_id: session.getCartId().toString(),
        created_at: session.getCreatedAt(),
      },
    });
    return created.id;
  }

  async findByReference(reference: string): Promise<PaymentSession | null> {
    const row = await this.prisma.payment_sessions.findUnique({
      where: { reference },
    });
    return row ? this.toDomainEntity(row) : null;
  }

  async findByProviderReference(
    providerReference: string,
  ): Promise<PaymentSession | null> {
    const row = await this.prisma.payment_sessions.findFirst({
      where: { provider_reference: providerReference },
    });
    return row ? this.toDomainEntity(row) : null;
  }

  async findPendingByCartId(cartId: CartId): Promise<PaymentSession | null> {
    const row = await this.prisma.payment_sessions.findFirst({
      where: {
        cart_id: cartId.toString(),
        status: PaymentSessionStatusEnum.PENDING,
      },
    });
    return row ? this.toDomainEntity(row) : null;
  }

  private toDomainEntity(row: PaymentSessionRow): PaymentSession {
    return PaymentSession.reconstitute({
      id: row.id,
      tenantId: TenantId.createFromString(row.tenant_id),
      guestAccountId: GuestAccountId.createFromString(row.guest_account_id),
      cartId: CartId.createFromString(row.cart_id),
      reference: row.reference,
      amountInCents: Number(row.amount_in_cents),
      currency: row.currency as 'COP',
      publicKey: row.public_key,
      signatureIntegrity: row.signature_integrity,
      redirectUrl: row.redirect_url,
      expirationTime: row.expiration_time,
      providerReference: row.provider_reference,
      status: row.status as PaymentSessionStatusEnum,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
