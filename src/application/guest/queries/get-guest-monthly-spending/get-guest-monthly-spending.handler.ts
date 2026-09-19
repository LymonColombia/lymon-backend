import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';
import { GetGuestMonthlySpendingQuery } from './get-guest-monthly-spending.query';
import {
  GetGuestMonthlySpendingResult,
  MonthlySpendingItem,
} from './get-guest-monthly-spending.result';
import {
  RESERVATION_REPOSITORY,
  type ReservationRepository,
} from '@/domain/reservation/repositories/reservation.repository';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';

const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function buildZeroSkeleton(fromDate: Date, toDate: Date): MonthlySpendingItem[] {
  const skeleton: MonthlySpendingItem[] = [];
  const cursor = new Date(
    Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), 1),
  );
  const end = new Date(
    Date.UTC(toDate.getUTCFullYear(), toDate.getUTCMonth(), 1),
  );

  while (cursor <= end) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth() + 1;
    skeleton.push({
      year,
      month,
      label: `${MONTH_NAMES[month - 1]} ${year}`,
      totalSpend: 0,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return skeleton;
}

@QueryHandler(GetGuestMonthlySpendingQuery)
export class GetGuestMonthlySpendingHandler
  implements
    IQueryHandler<GetGuestMonthlySpendingQuery, GetGuestMonthlySpendingResult>
{
  constructor(
    @Inject(RESERVATION_REPOSITORY)
    private readonly reservationRepository: ReservationRepository,
  ) {}

  async execute(
    query: GetGuestMonthlySpendingQuery,
  ): Promise<GetGuestMonthlySpendingResult> {
    const now = new Date();
    const fromDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1),
    );
    const toDate = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999),
    );

    let guestId: GuestId;
    try {
      guestId = GuestId.createFromString(query.guestId);
    } catch {
      return new GetGuestMonthlySpendingResult(
        buildZeroSkeleton(fromDate, toDate),
      );
    }

    const aggregation =
      await this.reservationRepository.getMonthlySpendingByGuestId(
        query.tenantId,
        guestId.toString(),
        fromDate,
        toDate,
      );

    const skeleton = buildZeroSkeleton(fromDate, toDate);

    const spendByKey = new Map<string, number>();
    for (const row of aggregation) {
      spendByKey.set(`${row.year}-${row.month}`, row.totalSpend);
    }

    for (const slot of skeleton) {
      const spend = spendByKey.get(`${slot.year}-${slot.month}`);
      if (spend !== undefined) {
        slot.totalSpend = spend;
      }
    }

    return new GetGuestMonthlySpendingResult(skeleton);
  }
}
