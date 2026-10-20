import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Experience } from '@/domain/experience/entities/experience.entity';
import {
  ExperienceScope,
  ExperienceScopeEnum,
} from '@/domain/experience/value-objects/experience-scope.vo';
import type { ExperienceRepository } from '@/domain/experience/repositories/experience.repository';
import { ExperienceAvailabilityType } from '@/domain/experience/value-objects/experience-availability-type.vo';
import { ExperienceCategory } from '@/domain/experience/value-objects/experience-category.vo';
import { ExperienceId } from '@/domain/experience/value-objects/experience-id.vo';
import { ExperienceStatus } from '@/domain/experience/value-objects/experience-status.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { createExperienceRepositoryMock } from '@test/shared/mocks/repositories/experience-repository.mock';
import { createPropertyRepositoryMock } from '@test/shared/mocks/repositories/property-repository.mock';
import type { PropertyRepository } from '@/domain/property/repositories/property.repository';
import { ExperienceController } from '@/presentation/controllers/experience.controller';
import { GetExperiencesByTenantQuery } from '@/application/experience/queries/GetExperiencesByTenant/get-experiences-by-tenant.query';
import { GetExperiencesByTenantQueryHandler } from '@/application/experience/queries/GetExperiencesByTenant/get-experiences-by-tenant.query-handler';
import { GetExperiencesByTenantResult } from '@/application/experience/queries/GetExperiencesByTenant/get-experiences-by-tenant.result';
import { GetExperienceByIdQuery } from '@/application/experience/queries/GetExperienceById/get-experience-by-id.query';
import { GetExperienceByIdQueryHandler } from '@/application/experience/queries/GetExperienceById/get-experience-by-id.query-handler';
import { GetExperienceByIdResult } from '@/application/experience/queries/GetExperienceById/get-experience-by-id.result';

const TENANT_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000';
const EXPERIENCE_ID = 'experience-123';

function makeExperience(overrides?: Partial<{ id: string; tenantId: string }>) {
  return Experience.reconstitute({
    id: ExperienceId.create(overrides?.id ?? EXPERIENCE_ID),
    tenantId: TenantId.createFromString(overrides?.tenantId ?? TENANT_ID),
    scope: ExperienceScope.create(ExperienceScopeEnum.PROPERTY),
    propertyId: PropertyId.create('65f1a1a2-b3c4-d5e6-f7a8-b9c100000000'),
    name: 'Airport transfer',
    description: 'Private transfer service',
    city: 'Medellín',
    category: ExperienceCategory.create('TRANSPORTATION'),
    priceCop: 120000,
    capacity: 8,
    availabilityType: ExperienceAvailabilityType.create('RECURRING'),
    recurrence: { daysOfWeek: [1, 3, 5], startTime: '09:00', endTime: '17:00' },
    allowStandalonePurchase: true,
    allowReservationPurchase: true,
    minNoticeHours: 2,
    purchaseCutoffHours: 24,
    status: ExperienceStatus.create('ACTIVE'),
    createdAt: new Date('2099-01-01T00:00:00.000Z'),
    updatedAt: new Date('2099-01-01T00:00:00.000Z'),
    deletedAt: null,
  });
}

describe('GetExperiencesByTenant', () => {
  let handler: GetExperiencesByTenantQueryHandler;
  let getByIdHandler: GetExperienceByIdQueryHandler;
  let experienceRepository: jest.Mocked<ExperienceRepository>;
  let propertyRepository: jest.Mocked<PropertyRepository>;
  let controller: ExperienceController;
  let queryBus: QueryBus;

  beforeEach(async () => {
    experienceRepository = createExperienceRepositoryMock();
    propertyRepository = createPropertyRepositoryMock();

    const storage = { getPublicUrl: (k: string) => k } as any;
    handler = new GetExperiencesByTenantQueryHandler(
      experienceRepository,
      storage,
    );
    getByIdHandler = new GetExperienceByIdQueryHandler(
      experienceRepository,
      propertyRepository,
      storage,
    );

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExperienceController],
      providers: [
        {
          provide: QueryBus,
          useValue: { execute: jest.fn() },
        },
        {
          provide: CommandBus,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<ExperienceController>(ExperienceController);
    queryBus = module.get<QueryBus>(QueryBus);
  });

  it('handler returns paginated tenant experiences mapped as DTOs', async () => {
    experienceRepository.findByTenantIdPaginated.mockResolvedValue({
      experiences: [makeExperience()],
      total: 1,
    });

    const result = await handler.execute(
      new GetExperiencesByTenantQuery(TENANT_ID, 1, 10),
    );

    expect(result).toBeInstanceOf(GetExperiencesByTenantResult);
    expect(result.experiences).toHaveLength(1);
    expect(result.experiences[0].id).toBe(EXPERIENCE_ID);
  });

  it('controller executes query bus with current tenant', async () => {
    const mockResult = new GetExperiencesByTenantResult(
      [
        {
          id: EXPERIENCE_ID,
          name: 'Airport transfer',
        } as any,
      ],
      1,
      1,
      10,
    );

    (queryBus.execute as jest.Mock).mockResolvedValue(mockResult);

    const response = await controller.getAll(
      {
        tenantId: TENANT_ID,
      } as any,
      undefined,
      1,
      10,
      undefined,
    );

    expect(queryBus.execute).toHaveBeenCalledWith(
      expect.any(GetExperiencesByTenantQuery),
    );
    expect(response.data.experiences[0].id).toBe(EXPERIENCE_ID);
  });

  it('getById handler returns mapped experience for same tenant', async () => {
    experienceRepository.findById.mockResolvedValue(makeExperience());
    propertyRepository.findById.mockResolvedValue(null);

    const result = await getByIdHandler.execute(
      new GetExperienceByIdQuery(EXPERIENCE_ID, TENANT_ID),
    );

    expect(result).toBeInstanceOf(GetExperienceByIdResult);
    expect(result.experience.id).toBe(EXPERIENCE_ID);
    expect(result.propertyName).toBeNull();
    expect(result.units).toEqual([]);
  });

  it('getById handler throws NotFound when experience does not exist', async () => {
    experienceRepository.findById.mockResolvedValue(null);

    await expect(
      getByIdHandler.execute(
        new GetExperienceByIdQuery(EXPERIENCE_ID, TENANT_ID),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('getById handler throws NotFound when experience belongs to other tenant', async () => {
    experienceRepository.findById.mockResolvedValue(
      makeExperience({ tenantId: 'other-tenant-id' }),
    );

    await expect(
      getByIdHandler.execute(
        new GetExperienceByIdQuery(EXPERIENCE_ID, TENANT_ID),
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('controller getById executes query bus with experience and tenant id', async () => {
    const mockResult = new GetExperienceByIdResult(
      { id: EXPERIENCE_ID } as any,
      null,
      [],
    );
    (queryBus.execute as jest.Mock).mockResolvedValue(mockResult);

    const response = await controller.getById(
      {
        tenantId: TENANT_ID,
      } as any,
      EXPERIENCE_ID,
    );

    expect(queryBus.execute).toHaveBeenCalledWith(
      expect.any(GetExperienceByIdQuery),
    );
    expect(response.data.id).toBe(EXPERIENCE_ID);
  });
});
