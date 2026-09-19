export type PaymentCurrency = 'COP';

export interface PaymentCheckoutCustomerData {
  email?: string | null;
  fullName?: string | null;
  phoneNumber?: string | null;
  phoneNumberPrefix?: string | null;
  legalId?: string | null;
  legalIdType?: 'CC' | 'CE' | 'NIT' | 'PP' | null;
}

export interface PaymentCheckoutRequest {
  reference: string;
  amountInCents: number;
  currency: PaymentCurrency;
  redirectUrl?: string | null;
  expirationTime?: Date | null;
  customerData?: PaymentCheckoutCustomerData | null;
}

export interface PaymentCheckoutResponse {
  publicKey: string;
  reference: string;
  amountInCents: number;
  currency: PaymentCurrency;
  signatureIntegrity: string;
  redirectUrl?: string | null;
  expirationTime?: Date | null;
  customerData?: PaymentCheckoutCustomerData | null;
}

export interface IPaymentGateway {
  buildCheckoutPayload(
    request: PaymentCheckoutRequest,
  ): Promise<PaymentCheckoutResponse>;
}

export const PAYMENT_GATEWAY = 'PAYMENT_GATEWAY';
