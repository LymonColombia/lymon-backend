import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PersistenceModule } from '@/infrastructure/persistence/persistence.module';
import { GetExperiencePurchasesByGuestHandler } from '@/application/experience-purchase/queries/get-experience-purchases-by-guest/get-experience-purchases-by-guest.handler';
import { GetExperiencePurchaseByIdHandler } from '@/application/experience-purchase/queries/get-experience-purchase-by-id/get-experience-purchase-by-id.handler';
import { GetExperiencePurchasesByTenantHandler } from '@/application/experience-purchase/queries/get-experience-purchases-by-tenant/get-experience-purchases-by-tenant.handler';
import { GetExperienceReservedDatesQueryHandler } from '@/application/experience-purchase/queries/get-experience-reserved-dates/get-experience-reserved-dates.query-handler';
import { CancelExperiencePurchaseHandler } from '@/application/experience-purchase/commands/cancel-experience-purchase/cancel-experience-purchase.handler';

const QueryHandlers = [
  GetExperiencePurchasesByGuestHandler,
  GetExperiencePurchaseByIdHandler,
  GetExperiencePurchasesByTenantHandler,
  GetExperienceReservedDatesQueryHandler,
];

const CommandHandlers = [CancelExperiencePurchaseHandler];

@Module({
  imports: [CqrsModule, PersistenceModule],
  providers: [...QueryHandlers, ...CommandHandlers],
  exports: [...QueryHandlers, ...CommandHandlers],
})
export class ExperiencePurchaseApplicationModule {}
