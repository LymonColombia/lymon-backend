import { NotFoundException } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { GetUnitWithExternalIdsByIdQueryHandler } from '@/application/unit/queries/GetUnitWithExternalIdsById/get-unit-with-external-ids-by-id.query-handler';
import { GetUnitWithExternalIdsByIdQuery } from '@/application/unit/queries/GetUnitWithExternalIdsById/get-unit-with-external-ids-by-id.query';
import { GetUnitWithExternalIdsByIdResult } from '@/application/unit/queries/GetUnitWithExternalIdsById/get-unit-with-external-ids-by-id.result';
import type { UnitRepository } from '@/domain/unit/repositories/unit.repository';
import { createUnitRepositoryMock } from '@test/shared/mocks/repositories/unit-repository.mock';
import { createR2StorageServiceMock } from '@test/shared/mocks/services/r2-storage.mock';
import {
  makeUnit,
  UNIT_FIXTURE_DEFAULTS,
} from '@test/shared/fixtures/unit.fixture';
import { UnitController } from '@/presentation/controllers/unit.controller';

const UNIT_ID = UNIT_FIXTURE_DEFAULTS.id;
const TENANT_ID = UNIT_FIXTURE_DEFAULTS.tenantId;
const OTHER_TENANT_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9ff00000000';

describe('GetUnitWithExternalIdsById', () => {
  let handler: GetUnitWithExternalIdsByIdQueryHandler;
  let unitRepository: jest.Mocked<UnitRepository>;
  let controller: UnitController;
  let queryBus: { execute: jest.Mock };

  beforeEach(() => {
    unitRepository = createUnitRepositoryMock();
    handler = new GetUnitWithExternalIdsByIdQueryHandler(
      unitRepository,
      createR2StorageServiceMock(),
    );

    queryBus = { execute: jest.fn() };
    controller = new UnitController(
      { execute: jest.fn() } as unknown as CommandBus,
      queryBus as unknown as QueryBus,
    );
  });

  describe('TC-01: Consultar una Unit válida del tenant autenticado', () => {
    it('Handler should return the unit as UnitWithExternalIdsDto', async () => {
      const unit = makeUnit();
      unitRepository.findById.mockResolvedValue(unit);

      const query = new GetUnitWithExternalIdsByIdQuery(UNIT_ID, TENANT_ID);
      const result = await handler.execute(query);

      expect(result).toBeInstanceOf(GetUnitWithExternalIdsByIdResult);
      expect(result.unit.id).toBe(UNIT_ID);
      expect(result.unit.name).toBe(unit.getName());
    });

    it('Handler should throw NotFoundException if unit does not exist', async () => {
      unitRepository.findById.mockResolvedValue(null);

      const query = new GetUnitWithExternalIdsByIdQuery(
        'invalid-id',
        TENANT_ID,
      );
      await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
    });

    it('Handler should throw NotFoundException if unit belongs to a different tenant', async () => {
      const unit = makeUnit({ tenantId: OTHER_TENANT_ID });
      unitRepository.findById.mockResolvedValue(unit);

      const query = new GetUnitWithExternalIdsByIdQuery(UNIT_ID, TENANT_ID);
      await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
    });
  });

  describe('TC-03: Acceso protegido por autenticación de tenant', () => {
    it('The controller method should NOT have the @Public() decorator', () => {
      const target = controller.getByIdWithExternalIds;
      const isPublic = Reflect.getMetadata('isPublic', target);
      expect(isPublic).toBeUndefined();
    });

    it('The controller should call the query bus with tenantId from the authenticated user', async () => {
      const mockResult = new GetUnitWithExternalIdsByIdResult({
        id: UNIT_ID,
        name: 'Unit Name',
      } as any);
      queryBus.execute.mockResolvedValue(mockResult);

      const fakeUser = {
        tenantId: TENANT_ID,
        userId: 'user-1',
        email: 'a@b.com',
      } as any;
      const response = await controller.getByIdWithExternalIds(
        fakeUser,
        UNIT_ID,
      );

      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          unitId: UNIT_ID,
          tenantId: TENANT_ID,
        }),
      );
      expect(response.data.unit.id).toBe(UNIT_ID);
    });
  });
});
