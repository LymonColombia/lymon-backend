import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PersistenceModule } from '@/infrastructure/persistence/persistence.module';
import { CreateUnitRatingHandler } from '@/application/unit-rating/commands/create-unit-rating/create-unit-rating.handler';
import { GetUnitRatingsHandler } from '@/application/unit-rating/queries/get-unit-ratings/get-unit-ratings.handler';
import { GetGuestRatingsHandler } from '@/application/unit-rating/queries/get-guest-ratings/get-guest-ratings.handler';

const CommandHandlers = [CreateUnitRatingHandler];
const QueryHandlers = [GetUnitRatingsHandler, GetGuestRatingsHandler];

@Module({
  imports: [CqrsModule, PersistenceModule],
  providers: [...CommandHandlers, ...QueryHandlers],
  exports: [...CommandHandlers, ...QueryHandlers],
})
export class UnitRatingApplicationModule {}
