import { EMAIL_SERVICE } from '@/application/shared/services/email.service';
import { MESSAGE_BODY_PROVIDER } from '@/application/shared/services/message-body-provider.service';
import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BrevoEmailService } from './services/brevo-email.service';
import { EmailTemplateService } from '@/infrastructure/common/email-template.service';
import { GuestEmailCreatedListener } from './listeners/guest-email-created.listener';
import { GuestMessageCreatedListener } from './listeners/guest-message-created.listener';
import { NullMessageBodyProvider } from './providers/null-message-body-provider';
import { PersistenceModule } from '../persistence/persistence.module';

@Module({
  imports: [ConfigModule, forwardRef(() => PersistenceModule)],
  providers: [
    {
      provide: EMAIL_SERVICE,
      useClass: BrevoEmailService,
    },
    {
      provide: MESSAGE_BODY_PROVIDER,
      useClass: NullMessageBodyProvider,
    },
    EmailTemplateService,
    GuestEmailCreatedListener,
    GuestMessageCreatedListener,
  ],
  exports: [EMAIL_SERVICE, EmailTemplateService, MESSAGE_BODY_PROVIDER],
})
export class EmailModule {}
