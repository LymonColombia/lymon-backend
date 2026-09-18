import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ExperiencePurchasesController } from '@/presentation/controllers/experience-purchases.controller';
import { GetExperiencePurchasesByTenantHandler } from '@/application/experience-purchase/queries/get-experience-purchases-by-tenant/get-experience-purchases-by-tenant.handler';
import { GetExperiencePurchasesByTenantQuery } from '@/application/experience-purchase/queries/get-experience-purchases-by-tenant/get-experience-purchases-by-tenant.query';
import { GetExperiencePurchasesByTenantResult } from '@/application/experience-purchase/queries/get-experience-purchases-by-tenant/get-experience-purchases-by-tenant.result';
import type { ExperiencePurchaseRepository } from '@/domain/experience-purchase/repositories/experience-purchase.repository';
import { ExperiencePurchaseStatusEnum } from '@/domain/experience-purchase/value-objects/experience-purchase-status.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { createExperiencePurchaseRepositoryMock } from '@test/shared/mocks/repositories/experience-purchase-repository.mock';

const TENANT_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000';
const EXPERIENCE_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000';

describe('GetExperiencePurchasesByTenant', () => {
  let handler: GetExperiencePurchasesByTenantHandler;
  let repository: jest.Mocked<ExperiencePurchaseRepository>;
  let controller: ExperiencePurchasesController;
  let queryBus: { execute: jest.Mock };

  beforeEach(() => {
    repository = createExperiencePurchaseRepositoryMock();
    handler = new GetExperiencePurchasesByTenantHandler(repository);
    queryBus = { execute: jest.fn() };
    controller = new ExperiencePurchasesController(
      queryBus as unknown as QueryBus,
      { execute: jest.fn() } as unknown as CommandBus,
    );
  });

  it('handler returns paginated tenant purchases with filters', async () => {
    const purchase = {
      id: 'purchase-1',
      experienceId: EXPERIENCE_ID,
      experienceName: 'Coffee tasting',
      guestAccountId: 'guest-1',
      guestName: 'Ada Lovelace',
      purchasedAt: new Date('2026-06-01T10:00:00.000Z'),
      scheduledDate: new Date('2026-06-10T15:00:00.000Z'),
      quantity: 2,
      totalPriceCop: 120000,
      status: ExperiencePurchaseStatusEnum.CONFIRMED,
    };
    repository.findByTenantIdPaginated.mockResolvedValue([purchase]);
    repository.countByTenantId.mockResolvedValue(1);

    const result = await handler.execute(
      new GetExperiencePurchasesByTenantQuery(
        TENANT_ID,
        1,
        20,
        EXPERIENCE_ID,
        '2026-06-01T00:00:00.000Z',
        '2026-06-30T23:59:59.999Z',
        ExperiencePurchaseStatusEnum.CONFIRMED,
      ),
    );

    expect(result).toBeInstanceOf(GetExperiencePurchasesByTenantResult);
    expect(result.purchases).toEqual([purchase]);
    expect(result.totalPages).toBe(1);
    expect(repository.findByTenantIdPaginated).toHaveBeenCalledWith(
      expect.any(TenantId),
      1,
      20,
      {
        experienceId: EXPERIENCE_ID,
        dateFrom: new Date('2026-06-01T00:00:00.000Z'),
        dateTo: new Date('2026-06-30T23:59:59.999Z'),
        status: ExperiencePurchaseStatusEnum.CONFIRMED,
      },
    );
    expect(repository.countByTenantId).toHaveBeenCalledWith(
      expect.any(TenantId),
      expect.objectContaining({
        experienceId: EXPERIENCE_ID,
        status: ExperiencePurchaseStatusEnum.CONFIRMED,
      }),
    );
  });

  it('controller dispatches query with authenticated tenant and returns envelope', async () => {
    const result = new GetExperiencePurchasesByTenantResult(
      [
        {
          id: 'purchase-1',
          experienceId: EXPERIENCE_ID,
          experienceName: 'Coffee tasting',
          guestAccountId: 'guest-1',
          guestName: 'Ada Lovelace',
          purchasedAt: new Date('2026-06-01T10:00:00.000Z'),
          scheduledDate: null,
          quantity: 1,
          totalPriceCop: 60000,
          status: ExperiencePurchaseStatusEnum.PENDING,
        },
      ],
      1,
      1,
      20,
    );
    queryBus.execute.mockResolvedValue(result);

    const response = await controller.findAll({ tenantId: TENANT_ID } as any, {
      experienceId: EXPERIENCE_ID,
      status: ExperiencePurchaseStatusEnum.PENDING,
      page: 1,
      limit: 20,
    });

    expect(queryBus.execute).toHaveBeenCalledWith(
      expect.any(GetExperiencePurchasesByTenantQuery),
    );
    const dispatched = queryBus.execute.mock
      .calls[0][0] as GetExperiencePurchasesByTenantQuery;
    expect(dispatched.tenantId).toBe(TENANT_ID);
    expect(dispatched.experienceId).toBe(EXPERIENCE_ID);
    expect(response.data.purchases[0].guestName).toBe('Ada Lovelace');
    expect(response.data.pagination.totalPages).toBe(1);
  });
});
