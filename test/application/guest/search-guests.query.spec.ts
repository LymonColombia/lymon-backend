import { Test, TestingModule } from '@nestjs/testing';
import { SearchGuestsQuery } from '@/application/guest/queries/search-guests.query';
import { GUEST_REPOSITORY } from '@/domain/guest/repositories/guest.repository';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

describe('SearchGuestsQuery', () => {
  let query: SearchGuestsQuery;
  let mockRepository: any;

  beforeEach(async () => {
    mockRepository = {
      search: jest.fn().mockResolvedValue([]),
      findByTenantId: jest.fn().mockResolvedValue([]),
      searchPaginated: jest.fn().mockResolvedValue({ guests: [], total: 0 }),
      findByTenantIdPaginated: jest
        .fn()
        .mockResolvedValue({ guests: [], total: 0 }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchGuestsQuery,
        {
          provide: GUEST_REPOSITORY,
          useValue: mockRepository,
        },
      ],
    }).compile();

    query = module.get<SearchGuestsQuery>(SearchGuestsQuery);
  });

  it('should sanitize the search term (trim and lowercase)', async () => {
    const tenantId = TenantId.createFromString('hotel-123');
    const dirtyTerm = '  JUAN  ';

    await query.execute(tenantId, dirtyTerm, 1, 10, 'createdAt', 'desc');

    expect(mockRepository.searchPaginated).toHaveBeenCalledWith(
      tenantId,
      'juan',
      1,
      10,
    );
  });

  it('should call findByTenantIdPaginated if the term is empty', async () => {
    const tenantId = TenantId.createFromString('hotel-123');

    await query.execute(tenantId, '', 1, 10, 'createdAt', 'desc');

    expect(mockRepository.findByTenantIdPaginated).toHaveBeenCalledWith(
      tenantId,
      1,
      10,
      'createdAt',
      'desc',
    );
  });
});
