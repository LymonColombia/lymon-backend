import { CartId } from '@/domain/cart/value-objects/cart-id.vo';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { PaymentCurrency } from '@/domain/shared/payment-gateway.interface';
import { PaymentSessionStatusEnum } from '@/domain/payment/value-objects/payment-session-status.vo';

export interface PaymentSessionCreateParams {
  tenantId: TenantId;
  guestAccountId: GuestAccountId;
  cartId: CartId;
  reference: string;
  amountInCents: number;
  currency: PaymentCurrency;
  publicKey: string;
  signatureIntegrity: string;
  redirectUrl?: string | null;
  expirationTime?: Date | null;
}

export interface IPaymentSessionData {
  id: string | null;
  tenantId: TenantId;
  guestAccountId: GuestAccountId;
  cartId: CartId;
  reference: string;
  amountInCents: number;
  currency: PaymentCurrency;
  publicKey: string;
  signatureIntegrity: string;
  redirectUrl: string | null;
  expirationTime: Date | null;
  providerReference: string | null;
  status: PaymentSessionStatusEnum;
  createdAt: Date;
  updatedAt: Date;
}
