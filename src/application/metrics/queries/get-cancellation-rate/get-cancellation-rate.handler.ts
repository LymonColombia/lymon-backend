import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetCancellationRateQuery } from './get-cancellation-rate.query';
import { GetCancellationRateResult } from './get-cancellation-rate.result';
import { Inject } from '@nestjs/common';
import {
  METRICS_READ_REPOSITORY,
  type MetricsReadRepository,
} from '@/domain/metrics/repositories/metrics-read.repository';

@QueryHandler(GetCancellationRateQuery)
export class GetCancellationRateHandler implements IQueryHandler<
  GetCancellationRateQuery,
  GetCancellationRateResult
> {
  constructor(
    @Inject(METRICS_READ_REPOSITORY)
    private readonly metricsReadRepository: MetricsReadRepository,
  ) {}

  async execute(
    query: GetCancellationRateQuery,
  ): Promise<GetCancellationRateResult> {
    const metrics = await this.metricsReadRepository.getCancellationRates(
      query.tenantId,
      query.guestId,
      query.startDate,
      query.endDate,
    );

    return new GetCancellationRateResult(metrics);
  }
}
