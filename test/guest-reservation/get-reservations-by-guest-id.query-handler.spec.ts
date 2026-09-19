import { GuestReservationsReadRepository } from '@/domain/reservation/repositories/guest-reservations-read.repository';
import { GuestRepository } from '@/domain/guest/repositories/guest.repository';
import { Reservation } from '@/domain/reservation/entities/reservation.entity';
import { Guest } from '@/domain/guest/entities/guest.entity';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { UnitId } from '@/domain/unit/value-objects/unit-id.vo';
import { ReservationId } from '@/domain/reservation/value-objects/reservation-id.vo';
import { DateRange } from '@/domain/reservation/value-objects/date-range.vo';
import {
  ReservationSource,
  ReservationSourceEnum,
} from '@/domain/reservation/value-objects/reservation-source.vo';
import {
  GuestStatusEnum,
  GuestIdentity,
  GuestSummary,
} from '@/domain/guest/entities/guest.types';
import { GetReservationsByGuestIdHandler } from '@/application/reservation/queries/get-reservations-by-guest-id/get-reservations-by-guest-id.query-handler';
import { GetReservationsByGuestIdQuery } from '@/application/reservation/queries/get-reservations-by-guest-id/get-reservations-by-guest-id.query';
import { GetReservationsByGuestIdResult } from '@/application/reservation/queries/get-reservations-by-guest-id/get-reservations-by-guest-id.result';
import { createGuestRepositoryMock } from '@test/shared/mocks/repositories/guest-repository.mock';

const GUEST_ACCOUNT_ID = '65f1a1a2-b3c4-d5e6-f7a8-b90000000000';
const GUEST_ID_1 = '65f1a1a2-b3c4-d5e6-f7a8-b9d100000000';
const GUEST_ID_2 = '65f1a1a2-b3c4-d5e6-f7a8-b9d200000000';

function createGuestReservationsReadRepositoryMock(): jest.Mocked<GuestReservationsReadRepository> {
  return {
    findByGuestIds: jest.fn(),
    countByGuestIds: jest.fn(),
    getLifecycleStatusByGuestIds: jest.fn().mockResolvedValue(new Map()),
  };
}


function makeGuest(guestId: string, tenantId: string): Guest {
  const identity: GuestIdentity = {};
  const summary: GuestSummary = {
    totalBookings: 0,
    totalNights: 0,
    totalSpend: 0,
    lastStayAt: null,
    lastPropertyId: null,
    lastUnitId: null,
  };

  return Guest.reconstitute({
    id: GuestId.createFromString(guestId),
    tenantId: TenantId.createFromString(tenantId),
    guestAccountId: GuestAccountId.createFromString(GUEST_ACCOUNT_ID),
    identity,
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe',
    primaryEmail: 'john@example.com',
    emails: ['john@example.com'],
    phones: [],
    status: GuestStatusEnum.ACTIVE,
    tags: [],
    preferences: [],
    summary,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function makeReservation(
  id: string,
  guestId: string,
  tenantId: string,
): Reservation {
  const reservation = Reservation.createConfirmed({
    tenantId: TenantId.createFromString(tenantId),
    propertyId: PropertyId.create('65f1a1a2-b3c4-d5e6-f7a8-b9c100000000'),
    unitId: UnitId.create('65f1a1a2-b3c4-d5e6-f7a8-b9c200000000'),
    guestId: GuestId.createFromString(guestId),
    dateRange: DateRange.create(
      new Date(Date.now() + 24 * 60 * 60 * 1000),
      new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
    ),
    source: ReservationSource.create(ReservationSourceEnum.DIRECT),
    guestsCount: 2,
    pricePerNight: 120,
  });
  reservation.setId(ReservationId.create(id));
  return reservation;
}

describe('GetReservationsByGuestIdHandler', () => {
  let handler: GetReservationsByGuestIdHandler;
  let guestReservationsReadRepository: jest.Mocked<GuestReservationsReadRepository>;
  let guestRepository: jest.Mocked<GuestRepository>;

  beforeEach(() => {
    guestReservationsReadRepository =
      createGuestReservationsReadRepositoryMock();
    guestRepository = createGuestRepositoryMock();
    handler = new GetReservationsByGuestIdHandler(
      guestReservationsReadRepository,
      guestRepository,
    );
  });

  it('returns empty result when no guest profiles exist for the guestAccountId', async () => {
    guestRepository.findAllByGuestAccountId.mockResolvedValue([]);

    const result = await handler.execute(
      new GetReservationsByGuestIdQuery(GUEST_ACCOUNT_ID, 1, 10),
    );

    expect(result).toBeInstanceOf(GetReservationsByGuestIdResult);
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
    expect(
      guestReservationsReadRepository.findByGuestIds,
    ).not.toHaveBeenCalled();
    expect(
      guestReservationsReadRepository.countByGuestIds,
    ).not.toHaveBeenCalled();
  });

  it('returns paginated reservations across all tenants for the guestAccountId', async () => {
    const guest1 = makeGuest(GUEST_ID_1, '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000');
    const guest2 = makeGuest(GUEST_ID_2, '65f1a1a2-b3c4-d5e6-f7a8-b9c900000000');
    const res1 = makeReservation(
      '65f1a1a2-b3c4-d5e6-f7a8-b9e100000000',
      GUEST_ID_1,
      '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
    );
    const res2 = makeReservation(
      '65f1a1a2-b3c4-d5e6-f7a8-b9e200000000',
      GUEST_ID_2,
      '65f1a1a2-b3c4-d5e6-f7a8-b9c900000000',
    );

    guestRepository.findAllByGuestAccountId.mockResolvedValue([guest1, guest2]);
    guestReservationsReadRepository.findByGuestIds.mockResolvedValue([
      res1,
      res2,
    ]);
    guestReservationsReadRepository.countByGuestIds.mockResolvedValue(2);

    const result = await handler.execute(
      new GetReservationsByGuestIdQuery(GUEST_ACCOUNT_ID, 1, 10),
    );

    expect(result).toBeInstanceOf(GetReservationsByGuestIdResult);
    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(result.page).toBe(1);
    expect(result.limit).toBe(10);
    expect(guestReservationsReadRepository.findByGuestIds).toHaveBeenCalledWith(
      [GUEST_ID_1, GUEST_ID_2],
      { page: 1, limit: 10, sortBy: 'createdAt', sortOrder: 'desc' },
    );
  });

  it('passes correct page and limit to the repository', async () => {
    const guest = makeGuest(GUEST_ID_1, '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000');

    guestRepository.findAllByGuestAccountId.mockResolvedValue([guest]);
    guestReservationsReadRepository.findByGuestIds.mockResolvedValue([]);
    guestReservationsReadRepository.countByGuestIds.mockResolvedValue(0);

    await handler.execute(
      new GetReservationsByGuestIdQuery(GUEST_ACCOUNT_ID, 3, 5),
    );

    expect(guestReservationsReadRepository.findByGuestIds).toHaveBeenCalledWith(
      [GUEST_ID_1],
      { page: 3, limit: 5, sortBy: 'createdAt', sortOrder: 'desc' },
    );
    expect(
      guestReservationsReadRepository.countByGuestIds,
    ).toHaveBeenCalledWith([GUEST_ID_1]);
  });

  it('returns correct total when it exceeds the page limit', async () => {
    const guest = makeGuest(GUEST_ID_1, '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000');
    const res = makeReservation(
      '65f1a1a2-b3c4-d5e6-f7a8-b9e100000000',
      GUEST_ID_1,
      '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
    );

    guestRepository.findAllByGuestAccountId.mockResolvedValue([guest]);
    guestReservationsReadRepository.findByGuestIds.mockResolvedValue([res]);
    guestReservationsReadRepository.countByGuestIds.mockResolvedValue(15);

    const result = await handler.execute(
      new GetReservationsByGuestIdQuery(GUEST_ACCOUNT_ID, 1, 10),
    );

    expect(result.total).toBe(15);
    expect(result.items).toHaveLength(1);
  });
});
