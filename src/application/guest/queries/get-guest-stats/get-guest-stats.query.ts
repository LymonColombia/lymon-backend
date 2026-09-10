import { GetGuestMonthlySpendingQuery } from '../get-guest-monthly-spending/get-guest-monthly-spending.query';
import { GetGuestBookingOriginsQuery } from '../get-guest-booking-origins/get-guest-booking-origins.query';
import { GetGuestRecencyQuery } from '../get-guest-recency/get-guest-recency.query';

// Guest stat catalog — single source of truth. Every stat takes (tenantId, guestId).
// Add a stat here and it is instantly selectable via the /stats endpoint. No presentation change.
export const GUEST_STAT_QUERIES = {
  monthlySpending: (tenantId: string, guestId: string) =>
    new GetGuestMonthlySpendingQuery(tenantId, guestId),
  bookingOrigins: (tenantId: string, guestId: string) =>
    new GetGuestBookingOriginsQuery(tenantId, guestId),
  recency: (tenantId: string, guestId: string) =>
    new GetGuestRecencyQuery(tenantId, guestId),
} as const;

export type GuestStatKey = keyof typeof GUEST_STAT_QUERIES;
export const GUEST_STAT_KEYS = Object.keys(GUEST_STAT_QUERIES) as GuestStatKey[];

export class GetGuestStatsQuery {
  constructor(
    public readonly tenantId: string,
    public readonly guestId: string,
    public readonly keys: readonly GuestStatKey[],
  ) {}
}
