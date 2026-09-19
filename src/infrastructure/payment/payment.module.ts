import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { PersistenceModule } from '@/infrastructure/persistence/persistence.module';
import { PAYMENT_GATEWAY } from '@/domain/shared/payment-gateway.interface';
import { WompiPaymentGateway } from './gateways/wompi.payment-gateway';
import { WompiWebhookController } from './controllers/wompi-webhook.controller';

@Module({
  imports: [ConfigModule, CqrsModule, PersistenceModule],
  controllers: [WompiWebhookController],
  providers: [
    {
      provide: PAYMENT_GATEWAY,
      useClass: WompiPaymentGateway,
    },
  ],
  exports: [PAYMENT_GATEWAY],
})
export class PaymentModule {}
