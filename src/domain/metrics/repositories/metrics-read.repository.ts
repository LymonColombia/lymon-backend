export const METRICS_READ_REPOSITORY = 'METRICS_READ_REPOSITORY';

export interface CancellationRateSourceMetric {
  source: string;
  total: number;
  cancelled: number;
  cancellationRate: number;
}

export interface CancellationReasonMetric {
  reason: string;
  count: number;
}

export interface CancellationRateMetrics {
  totalReservations: number;
  cancelledCount: number;
  noShowCount: number;
  cancellationRate: number;
  noShowRate: number;
  bySource: CancellationRateSourceMetric[];
  topCancellationReasons: CancellationReasonMetric[];
}

export interface MetricsReadRepository {
  getCancellationRates(
    tenantId: string,
    guestId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CancellationRateMetrics>;
}
