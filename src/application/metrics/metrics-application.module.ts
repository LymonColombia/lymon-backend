import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PersistenceModule } from '@/infrastructure/persistence/persistence.module';
import { GetCancellationRateHandler } from './queries/get-cancellation-rate/get-cancellation-rate.handler';

const QueryHandlers = [GetCancellationRateHandler];

@Module({
  imports: [CqrsModule, PersistenceModule],
  providers: [...QueryHandlers],
  exports: [...QueryHandlers],
})
export class MetricsApplicationModule {}
