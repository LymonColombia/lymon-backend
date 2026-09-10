import { GetGuestRecencyHandler } from '@/application/guest/queries/get-guest-recency/get-guest-recency.handler';
import { GetGuestRecencyQuery } from '@/application/guest/queries/get-guest-recency/get-guest-recency.query';
import { createReservationRepositoryMock } from '@test/shared/mocks/repositories/reservation-repository.mock';

const TENANT_ID = '65f1a1a2b3c4d5e6f7a8b9c0';
const GUEST_ID = '65f1a1a2b3c4d5e6f7a8b9c1';

describe('GetGuestRecencyHandler', () => {
  let reservationRepository: ReturnType<typeof createReservationRepositoryMock>;
  let handler: GetGuestRecencyHandler;

  beforeEach(() => {
    reservationRepository = createReservationRepositoryMock();
    handler = new GetGuestRecencyHandler(reservationRepository);
  });

  it('returns the last stay date and whole days elapsed since it', async () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000);
    reservationRepository.getLastStayAt.mockResolvedValue(fiveDaysAgo);

    const result = await handler.execute(
      new GetGuestRecencyQuery(TENANT_ID, GUEST_ID),
    );

    expect(result.lastStayAt).toBe(fiveDaysAgo.toISOString());
    expect(result.daysSinceLastStay).toBe(5);
    expect(reservationRepository.getLastStayAt).toHaveBeenCalledWith(
      TENANT_ID,
      GUEST_ID,
    );
  });

  it('returns null for both fields when the guest has no completed stays', async () => {
    reservationRepository.getLastStayAt.mockResolvedValue(null);

    const result = await handler.execute(
      new GetGuestRecencyQuery(TENANT_ID, GUEST_ID),
    );

    expect(result.lastStayAt).toBeNull();
    expect(result.daysSinceLastStay).toBeNull();
  });

  it('clamps daysSinceLastStay to 0 for a same-day or slightly future checkout', async () => {
    reservationRepository.getLastStayAt.mockResolvedValue(
      new Date(Date.now() + 60 * 1000),
    );

    const result = await handler.execute(
      new GetGuestRecencyQuery(TENANT_ID, GUEST_ID),
    );

    expect(result.daysSinceLastStay).toBe(0);
  });

  it('returns nulls for an invalid guest id without hitting the repository', async () => {
    const result = await handler.execute(
      new GetGuestRecencyQuery(TENANT_ID, 'not-an-id'),
    );

    expect(result.lastStayAt).toBeNull();
    expect(result.daysSinceLastStay).toBeNull();
    expect(reservationRepository.getLastStayAt).not.toHaveBeenCalled();
  });
});
