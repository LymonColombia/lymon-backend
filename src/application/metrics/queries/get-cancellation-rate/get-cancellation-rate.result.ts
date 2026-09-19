import { CancellationRateMetrics } from '@/domain/metrics/repositories/metrics-read.repository';

export class GetCancellationRateResult {
  constructor(public readonly metrics: CancellationRateMetrics) {}
}
