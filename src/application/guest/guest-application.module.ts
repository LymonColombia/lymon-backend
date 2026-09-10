import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PersistenceModule } from '@/infrastructure/persistence/persistence.module';
import { GuestPreferenceApplicationModule } from '@/application/guest-preference/guest-preference-application.module';
import { EmailModule } from '@/infrastructure/email/email.module';
import { SearchGuestsQuery } from './queries/search-guests.query';
import { GetGuestByIdHandler } from './queries/get-guest-by-id/get-guest-by-id.handler';
import { GetGuestBookingsHandler } from './queries/get-guest-bookings/get-guest-bookings.handler';
import { GetGuestMonthlySpendingHandler } from './queries/get-guest-monthly-spending/get-guest-monthly-spending.handler';
import { GetGuestBookingOriginsHandler } from './queries/get-guest-booking-origins/get-guest-booking-origins.handler';
import { GetGuestStatsHandler } from './queries/get-guest-stats/get-guest-stats.handler';
import { CreateGuestHandler } from '@/application/guest/commands/create-guest.handler';
import { AssignGuestTagsHandler } from './commands/assign-guest-tags.handler';
import { SaveGuestPreferencesHandler } from './commands/preferences/save-guest-preferences.handler';
import { GetGuestLifecycleStatusHandler } from './queries/get-guest-lifecycle-status/get-guest-lifecycle-status.handler';
import { UpdateGuestProfileHandler } from './commands/update-guest-profile/update-guest-profile.handler';
import { ConfirmGuestEmailChangeHandler } from './commands/confirm-email-change/confirm-guest-email-change.handler';
import { GetGuestRecencyHandler } from './queries/get-guest-recency/get-guest-recency.handler';

const CommandHandlers = [
  CreateGuestHandler,
  AssignGuestTagsHandler,
  SaveGuestPreferencesHandler,
  UpdateGuestProfileHandler,
  ConfirmGuestEmailChangeHandler,
  UpdateGuestProfileHandler,
];
const QueryHandlers = [
  SearchGuestsQuery,
  GetGuestByIdHandler,
  GetGuestBookingsHandler,
  GetGuestMonthlySpendingHandler,
  GetGuestBookingOriginsHandler,
  GetGuestLifecycleStatusHandler,
  GetGuestStatsHandler,
  GetGuestRecencyHandler,
];

@Module({
  imports: [
    CqrsModule,
    PersistenceModule,
    GuestPreferenceApplicationModule,
    EmailModule,
  ],
  providers: [...CommandHandlers, ...QueryHandlers],
  exports: [...CommandHandlers, ...QueryHandlers],
})
export class GuestApplicationModule {}
