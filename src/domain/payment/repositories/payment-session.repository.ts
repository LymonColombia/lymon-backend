import { CartId } from '@/domain/cart/value-objects/cart-id.vo';
import { PaymentSession } from '@/domain/payment/entities/payment-session.entity';
import { TransactionContextData } from '@/domain/shared/transaction-manager.interface';

export const PAYMENT_SESSION_REPOSITORY = 'PAYMENT_SESSION_REPOSITORY';

export interface PaymentSessionRepository {
  save(session: PaymentSession, ctx?: TransactionContextData): Promise<string>;
  findByReference(reference: string): Promise<PaymentSession | null>;
  findByProviderReference(
    providerReference: string,
  ): Promise<PaymentSession | null>;
  findPendingByCartId(cartId: CartId): Promise<PaymentSession | null>;
}
