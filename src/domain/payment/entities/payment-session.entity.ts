import { DomainException } from '@/domain/shared/exceptions/domain.exception';
import { CartId } from '@/domain/cart/value-objects/cart-id.vo';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import {
  PaymentSessionStatus,
  PaymentSessionStatusEnum,
} from '@/domain/payment/value-objects/payment-session-status.vo';
import {
  IPaymentSessionData,
  PaymentSessionCreateParams,
} from './payment-session.types';

export class PaymentSession {
  private constructor(
    private readonly id: string | null,
    private readonly tenantId: TenantId,
    private readonly guestAccountId: GuestAccountId,
    private readonly cartId: CartId,
    private readonly reference: string,
    private readonly amountInCents: number,
    private readonly currency: 'COP',
    private readonly publicKey: string,
    private readonly signatureIntegrity: string,
    private readonly redirectUrl: string | null,
    private readonly expirationTime: Date | null,
    private providerReference: string | null,
    private status: PaymentSessionStatus,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static create(params: PaymentSessionCreateParams): PaymentSession {
    if (!params.reference || params.reference.trim() === '') {
      throw new DomainException('Payment reference cannot be empty');
    }
    if (!Number.isInteger(params.amountInCents) || params.amountInCents <= 0) {
      throw new DomainException('Payment amount must be a positive integer');
    }
    if (!params.publicKey || params.publicKey.trim() === '') {
      throw new DomainException('Payment public key cannot be empty');
    }
    if (!params.signatureIntegrity || params.signatureIntegrity.trim() === '') {
      throw new DomainException('Payment signature cannot be empty');
    }

    return new PaymentSession(
      null,
      params.tenantId,
      params.guestAccountId,
      params.cartId,
      params.reference,
      params.amountInCents,
      params.currency,
      params.publicKey,
      params.signatureIntegrity,
      params.redirectUrl ?? null,
      params.expirationTime ?? null,
      null,
      PaymentSessionStatus.pending(),
      new Date(),
      new Date(),
    );
  }

  static reconstitute(data: IPaymentSessionData): PaymentSession {
    return new PaymentSession(
      data.id,
      data.tenantId,
      data.guestAccountId,
      data.cartId,
      data.reference,
      data.amountInCents,
      data.currency,
      data.publicKey,
      data.signatureIntegrity,
      data.redirectUrl,
      data.expirationTime,
      data.providerReference,
      PaymentSessionStatus.create(data.status),
      data.createdAt,
      data.updatedAt,
    );
  }

  registerProviderReference(providerReference: string): void {
    this.assertPending();
    if (!providerReference || providerReference.trim() === '') {
      throw new DomainException('Provider reference cannot be empty');
    }
    this.providerReference = providerReference;
    this.touch();
  }

  approve(providerReference?: string | null): void {
    this.transitionTo(PaymentSessionStatusEnum.APPROVED, providerReference);
  }

  decline(providerReference?: string | null): void {
    this.transitionTo(PaymentSessionStatusEnum.DECLINED, providerReference);
  }

  expire(providerReference?: string | null): void {
    this.transitionTo(PaymentSessionStatusEnum.EXPIRED, providerReference);
  }

  cancel(providerReference?: string | null): void {
    this.transitionTo(PaymentSessionStatusEnum.CANCELLED, providerReference);
  }

  private transitionTo(
    nextStatus: PaymentSessionStatusEnum,
    providerReference?: string | null,
  ): void {
    this.assertPending();
    if (!this.status.canTransitionTo(nextStatus)) {
      throw new DomainException(
        'Payment session cannot transition to that status',
      );
    }
    this.status = PaymentSessionStatus.create(nextStatus);
    if (providerReference) {
      this.providerReference = providerReference;
    }
    this.touch();
  }

  private assertPending(): void {
    if (!this.status.isPending()) {
      throw new DomainException('Payment session must be PENDING');
    }
  }

  getId(): string | null {
    return this.id;
  }

  getTenantId(): TenantId {
    return this.tenantId;
  }

  getGuestAccountId(): GuestAccountId {
    return this.guestAccountId;
  }

  getCartId(): CartId {
    return this.cartId;
  }

  getReference(): string {
    return this.reference;
  }

  getAmountInCents(): number {
    return this.amountInCents;
  }

  getCurrency(): 'COP' {
    return this.currency;
  }

  getPublicKey(): string {
    return this.publicKey;
  }

  getSignatureIntegrity(): string {
    return this.signatureIntegrity;
  }

  getRedirectUrl(): string | null {
    return this.redirectUrl;
  }

  getExpirationTime(): Date | null {
    return this.expirationTime;
  }

  getProviderReference(): string | null {
    return this.providerReference;
  }

  getStatus(): PaymentSessionStatus {
    return this.status;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  private touch(): void {
    this.updatedAt = new Date();
  }
}
