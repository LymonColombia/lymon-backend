import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EMAIL_WEBHOOK_VERIFIER } from '@/application/shared/ports/email-webhook-verifier.port';
import { BrevoWebhookVerifier } from './adapters/brevo-webhook-verifier.adapter';

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: EMAIL_WEBHOOK_VERIFIER,
      useClass: BrevoWebhookVerifier,
    },
  ],
  exports: [EMAIL_WEBHOOK_VERIFIER],
})
export class CommunicationWebhookModule {}
