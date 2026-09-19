import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { IEmailWebhookVerifier } from '@/application/shared/ports/email-webhook-verifier.port';

@Injectable()
export class BrevoWebhookVerifier implements IEmailWebhookVerifier {
  private readonly logger = new Logger(BrevoWebhookVerifier.name);
  private readonly secret: string | null;

  constructor(configService: ConfigService) {
    this.secret = configService.get<string>('EMAIL_WEBHOOK_SECRET') ?? null;
  }

  verify(rawBody: Buffer, signature: string): boolean {
    if (!this.secret) {
      this.logger.warn(
        'EMAIL_WEBHOOK_SECRET not configured — skipping signature verification',
      );
      return false;
    }

    if (!signature) {
      return false;
    }

    const expected = createHmac('sha256', this.secret)
      .update(rawBody)
      .digest('hex');

    const expectedBuf = Buffer.from(expected, 'utf8');
    const providedBuf = Buffer.from(signature.toLowerCase(), 'utf8');

    if (expectedBuf.length !== providedBuf.length) {
      return false;
    }

    return timingSafeEqual(expectedBuf, providedBuf);
  }
}
