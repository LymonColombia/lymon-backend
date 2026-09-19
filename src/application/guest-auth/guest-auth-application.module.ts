import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PersistenceModule } from '@/infrastructure/persistence/persistence.module';
import { GuestAuthModule } from '@/infrastructure/guest-auth/guest-auth.module';
import { EmailModule } from '@/infrastructure/email/email.module';
import { StorageModule } from '@/infrastructure/storage/storage.module';
import { RegisterGuestAccountHandler } from '@/application/guest-auth/commands/register-guest-account/register-guest-account.handler';
import { VerifyGuestEmailHandler } from '@/application/guest-auth/commands/verify-guest-email/verify-guest-email.handler';
import { GuestLoginHandler } from '@/application/guest-auth/commands/login-guest/login-guest.handler';
import { RecoverGuestPasswordHandler } from '@/application/guest-auth/commands/recover-guest-password/recover-guest-password.handler';
import { ConfirmRecoverGuestPasswordHandler } from '@/application/guest-auth/commands/confirm-recover-guest-password/confirm-recover-guest-password.handler';
import { ChangeGuestPasswordHandler } from '@/application/guest-auth/commands/change-guest-password/change-guest-password.handler';
import { RefreshGuestTokenHandler } from '@/application/guest-auth/commands/refresh-guest-token/refresh-guest-token.handler';
import { LogoutGuestHandler } from '@/application/guest-auth/commands/logout-guest/logout-guest.handler';
import { UpdateGuestProfilePhotoHandler } from '@/application/guest-auth/commands/update-guest-profile-photo/update-guest-profile-photo.handler';
import { UpdateGuestAccountProfileHandler } from '@/application/guest-auth/commands/update-guest-account-profile/update-guest-account-profile.handler';
import { ConfirmGuestAccountEmailChangeHandler } from '@/application/guest-auth/commands/confirm-guest-account-email-change/confirm-guest-account-email-change.handler';
import { GenerateGuestProfilePhotoUrlQueryHandler } from '@/application/guest-auth/queries/generate-guest-profile-photo-url/generate-guest-profile-photo-url.query-handler';
import { GetGuestAccountProfileQueryHandler } from '@/application/guest-auth/queries/get-guest-account-profile/get-guest-account-profile.query-handler';

const CommandHandlers = [
  RegisterGuestAccountHandler,
  VerifyGuestEmailHandler,
  GuestLoginHandler,
  RecoverGuestPasswordHandler,
  ConfirmRecoverGuestPasswordHandler,
  ChangeGuestPasswordHandler,
  RefreshGuestTokenHandler,
  LogoutGuestHandler,
  UpdateGuestProfilePhotoHandler,
  UpdateGuestAccountProfileHandler,
  ConfirmGuestAccountEmailChangeHandler,
];

const QueryHandlers = [
  GenerateGuestProfilePhotoUrlQueryHandler,
  GetGuestAccountProfileQueryHandler,
];

@Module({
  imports: [
    CqrsModule,
    PersistenceModule,
    GuestAuthModule,
    EmailModule,
    StorageModule,
  ],
  providers: [...CommandHandlers, ...QueryHandlers],
  exports: [...CommandHandlers, ...QueryHandlers, GuestAuthModule],
})
export class GuestAuthApplicationModule {}
