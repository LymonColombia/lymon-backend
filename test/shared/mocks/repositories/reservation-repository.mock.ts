import { ReservationRepository } from '@/domain/reservation/repositories/reservation.repository';

export function createReservationRepositoryMock(): jest.Mocked<ReservationRepository> {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findByTenantId: jest.fn(),
    findByPropertyId: jest.fn(),
    findByUnitId: jest.fn(),
    findByGuestId: jest.fn(),
    findByUnitAndDateRange: jest.fn(),
    findActiveByUnitFromDate: jest.fn(),
    findByExternalId: jest.fn(),
    existsActiveByPropertyId: jest.fn(),
    existsActiveByUnitId: jest.fn(),
    countByTenantId: jest.fn(),
    countByGuestId: jest.fn(),
    countByGuestIdGroupedBySource: jest.fn(),
    findConfirmedDueForCheckIn: jest.fn(),
    getMonthlySpendingByGuestId: jest.fn(),
    getLastStayAt: jest.fn(),
  };
}
