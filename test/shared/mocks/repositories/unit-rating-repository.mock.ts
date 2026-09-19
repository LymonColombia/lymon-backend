import { UnitRatingRepository } from '@/domain/unit-rating/repositories/unit-rating.repository';

export function createUnitRatingRepositoryMock(): jest.Mocked<UnitRatingRepository> {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findByReservationId: jest.fn(),
    findByUnitIdPaginated: jest.fn(),
    calculateAverageForUnit: jest.fn(),
    findByGuestIdPaginated: jest.fn(),
    calculateAverageForGuest: jest.fn(),
  };
}
