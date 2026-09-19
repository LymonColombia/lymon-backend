import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreateUnitHandler } from '@/application/unit/commands/create-unit.handler';
import { CreateUnitCommand } from '@/application/unit/commands/create-unit.command';
import { CreateUnitResult } from '@/application/unit/commands/create-unit.result';
import { UnitRepository } from '@/domain/unit/repositories/unit.repository';
import { PropertyRepository } from '@/domain/property/repositories/property.repository';
import { TenantRepository } from '@/domain/tenant/repositories/tenant.repository';
import { createUnitRepositoryMock } from '@test/shared/mocks/repositories/unit-repository.mock';
import { createPropertyRepositoryMock } from '@test/shared/mocks/repositories/property-repository.mock';
import { createTenantRepositoryMock } from '@test/shared/mocks/repositories/tenant-repository.mock';
import { createEventEmitterMock } from '@test/shared/mocks/services/event-emitter.mock';
import {
  makeTenant,
  TENANT_FIXTURE_DEFAULTS,
} from '@test/shared/fixtures/tenant.fixture';
import {
  makeProperty,
  PROPERTY_FIXTURE_DEFAULTS,
} from '@test/shared/fixtures/property.fixture';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const UNIT_ID = 'unit-789';

function makeCommand(
  overrides?: Partial<{ tenantId: string; propertyId: string }>,
): CreateUnitCommand {
  return new CreateUnitCommand(
    overrides?.tenantId ?? TENANT_FIXTURE_DEFAULTS.id,
    overrides?.propertyId ?? PROPERTY_FIXTURE_DEFAULTS.id,
    'Habitación doble',
    'Amplia habitación con vista al lago',
    1,
    4,
    2,
    [{ roomName: 'Dormitorio 1', beds: [{ type: 'DOUBLE', count: 1 }] }],
    1,
    false,
    ['wifi', 'parking'],
    100,
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CreateUnitHandler', () => {
  let handler: CreateUnitHandler;
  let unitRepository: jest.Mocked<UnitRepository>;
  let propertyRepository: jest.Mocked<PropertyRepository>;
  let tenantRepository: jest.Mocked<TenantRepository>;
  let eventEmitter: ReturnType<typeof createEventEmitterMock>;

  beforeEach(() => {
    unitRepository = createUnitRepositoryMock();
    propertyRepository = createPropertyRepositoryMock();
    tenantRepository = createTenantRepositoryMock();
    eventEmitter = createEventEmitterMock();

    handler = new CreateUnitHandler(
      unitRepository,
      propertyRepository,
      tenantRepository,
      eventEmitter as any,
    );
  });

  describe('when tenant does not exist', () => {
    it('throws NotFoundException', async () => {
      tenantRepository.findById.mockResolvedValue(null);

      await expect(handler.execute(makeCommand())).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('when property does not exist', () => {
    it('throws NotFoundException', async () => {
      tenantRepository.findById.mockResolvedValue(makeTenant());
      propertyRepository.findById.mockResolvedValue(null);

      await expect(handler.execute(makeCommand())).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('when property belongs to a different tenant', () => {
    it('throws ForbiddenException', async () => {
      tenantRepository.findById.mockResolvedValue(makeTenant());
      propertyRepository.findById.mockResolvedValue(
        makeProperty({ tenantId: 'other-tenant-999' }),
      );

      await expect(handler.execute(makeCommand())).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('when plan limit is reached', () => {
    it('throws ForbiddenException', async () => {
      tenantRepository.findById.mockResolvedValue(makeTenant());
      propertyRepository.findById.mockResolvedValue(makeProperty());
      propertyRepository.countByTenantId.mockResolvedValue(1);
      unitRepository.countByTenantId.mockResolvedValue(1);
      // TRIAL plan siteLimit = 2, so 1 + 1 = 2 >= 2

      await expect(handler.execute(makeCommand())).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('when all validations pass', () => {
    it('saves the unit and returns the unitId', async () => {
      tenantRepository.findById.mockResolvedValue(makeTenant());
      propertyRepository.findById.mockResolvedValue(makeProperty());
      propertyRepository.countByTenantId.mockResolvedValue(0);
      unitRepository.countByTenantId.mockResolvedValue(0);
      unitRepository.save.mockResolvedValue(UNIT_ID);

      const result = await handler.execute(makeCommand());

      expect(result).toBeInstanceOf(CreateUnitResult);
      expect(result.unitId).toBe(UNIT_ID);
    });
  });
});
