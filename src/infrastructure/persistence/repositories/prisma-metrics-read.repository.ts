import { Injectable } from '@nestjs/common';
import {
  CancellationRateMetrics,
  CancellationRateSourceMetric,
  CancellationReasonMetric,
  MetricsReadRepository,
} from '@/domain/metrics/repositories/metrics-read.repository';
import { ReservationStatusEnum } from '@/domain/reservation/value-objects/reservation-status.vo';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';

/**
 * `source IS NULL` marks the grand-total row produced by GROUPING SETS, which is how the
 * mongo $facet's `totals` and `bySource` branches collapse into one pass over the rows.
 */
interface RateRow {
  source: string | null;
  total: bigint;
  cancelled: bigint;
  no_show: bigint;
}

const percentage = (part: number, whole: number): number =>
  whole > 0 ? Number(((part / whole) * 100).toFixed(2)) : 0;

@Injectable()
export class PrismaMetricsReadRepository implements MetricsReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getCancellationRates(
    tenantId: string,
    guestId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CancellationRateMetrics> {
    const [rates, reasons] = await Promise.all([
      this.prisma.$queryRaw<RateRow[]>`
        SELECT source,
               COUNT(*)                                                     AS total,
               COUNT(*) FILTER (WHERE status = ${ReservationStatusEnum.CANCELLED}) AS cancelled,
               COUNT(*) FILTER (WHERE status = ${ReservationStatusEnum.NO_SHOW})   AS no_show
        FROM reservations
        WHERE tenant_id = ${tenantId}::uuid
          AND guest_id = ${guestId}::uuid
          AND check_in BETWEEN ${startDate}::date AND ${endDate}::date
        GROUP BY GROUPING SETS ((), (source))
      `,
      this.prisma.$queryRaw<{ reason: string; count: bigint }[]>`
        SELECT cancellation_reason AS reason, COUNT(*) AS count
        FROM reservations
        WHERE tenant_id = ${tenantId}::uuid
          AND guest_id = ${guestId}::uuid
          AND check_in BETWEEN ${startDate}::date AND ${endDate}::date
          AND status = ${ReservationStatusEnum.CANCELLED}
          AND cancellation_reason IS NOT NULL
        GROUP BY cancellation_reason
        ORDER BY count DESC
        LIMIT 5
      `,
    ]);

    const grandTotal = rates.find((row) => row.source === null);
    const totalReservations = Number(grandTotal?.total ?? 0);
    const cancelledCount = Number(grandTotal?.cancelled ?? 0);
    const noShowCount = Number(grandTotal?.no_show ?? 0);

    const bySource: CancellationRateSourceMetric[] = rates
      .filter((row) => row.source !== null)
      .map((row) => {
        const total = Number(row.total);
        const cancelled = Number(row.cancelled);
        return {
          source: row.source as string,
          total,
          cancelled,
          cancellationRate: percentage(cancelled, total),
        };
      });

    const topCancellationReasons: CancellationReasonMetric[] = reasons.map(
      (row) => ({ reason: row.reason, count: Number(row.count) }),
    );

    return {
      totalReservations,
      cancelledCount,
      noShowCount,
      cancellationRate: percentage(cancelledCount, totalReservations),
      noShowRate: percentage(noShowCount, totalReservations),
      bySource,
      topCancellationReasons,
    };
  }
}
