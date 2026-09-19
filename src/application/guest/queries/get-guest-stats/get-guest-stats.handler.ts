import { IQueryHandler, QueryHandler, QueryBus } from '@nestjs/cqrs';
import { GetGuestStatsQuery, GUEST_STAT_QUERIES } from './get-guest-stats.query';

@QueryHandler(GetGuestStatsQuery)
export class GetGuestStatsHandler implements IQueryHandler<GetGuestStatsQuery> {
  constructor(private readonly queryBus: QueryBus) {}

  async execute({
    tenantId,
    guestId,
    keys,
  }: GetGuestStatsQuery): Promise<Record<string, unknown>> {
    const entries = await Promise.all(
      keys.map(
        async (key) =>
          [
            key,
            await this.queryBus.execute(
              GUEST_STAT_QUERIES[key](tenantId, guestId),
            ),
          ] as const,
      ),
    );

    return Object.fromEntries(entries);
  }
}
