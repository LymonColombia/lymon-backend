import { ExperiencePurchaseRepository } from '@/domain/experience-purchase/repositories/experience-purchase.repository';

export function createExperiencePurchaseRepositoryMock(): jest.Mocked<ExperiencePurchaseRepository> {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findByGuestAccountId: jest.fn(),
    countByGuestAccountId: jest.fn(),
    findByTenantIdPaginated: jest.fn(),
    countByTenantId: jest.fn(),
    countConfirmedByExperienceAndDate: jest.fn(),
    findReservedDatesByExperienceId: jest.fn(),
  };
}
