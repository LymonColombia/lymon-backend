import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import {
  IPaymentGateway,
  PaymentCheckoutRequest,
  PaymentCheckoutResponse,
} from '@/domain/shared/payment-gateway.interface';

@Injectable()
export class WompiPaymentGateway implements IPaymentGateway {
  private readonly publicKey: string;
  private readonly integritySecret: string;
  private readonly redirectUrl: string | null;

  constructor(private readonly configService: ConfigService) {
    this.publicKey = this.requireConfig('WOMPI_PUBLIC_KEY');
    this.integritySecret = this.requireConfig('WOMPI_INTEGRITY_SECRET');
    this.redirectUrl =
      this.configService.get<string>('WOMPI_REDIRECT_URL') ?? null;
  }

  async buildCheckoutPayload(
    request: PaymentCheckoutRequest,
  ): Promise<PaymentCheckoutResponse> {
    const signatureIntegrity = this.buildSignature(request);
    const redirectUrl = request.redirectUrl ?? this.redirectUrl;

    return {
      publicKey: this.publicKey,
      reference: request.reference,
      amountInCents: request.amountInCents,
      currency: request.currency,
      signatureIntegrity,
      redirectUrl,
      expirationTime: request.expirationTime ?? null,
      customerData: request.customerData ?? null,
    };
  }

  private buildSignature(request: PaymentCheckoutRequest): string {
    const parts = [
      request.reference,
      request.amountInCents.toString(),
      request.currency,
    ];

    if (request.expirationTime) {
      parts.push(request.expirationTime.toISOString());
    }

    parts.push(this.integritySecret);

    return createHash('sha256').update(parts.join('')).digest('hex');
  }

  private requireConfig(key: string): string {
    const value = this.configService.get<string>(key);
    if (!value || value.trim() === '') {
      throw new Error(
        `${key} environment variable is not configured. Please add ${key} to your .env file.`,
      );
    }

    return value;
  }
}
