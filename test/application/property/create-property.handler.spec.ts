import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { CreatePropertyHandler } from '@/application/property/commands/create-property.handler';
import { CreatePropertyCommand } from '@/application/property/commands/create-property.command';
import { CreatePropertyResult } from '@/application/property/commands/create-property.result';
import { PropertyRepository } from '@/domain/property/repositories/property.repository';
import { UnitRepository } from '@/domain/unit/repositories/unit.repository';
import { TenantRepository } from '@/domain/tenant/repositories/tenant.repository';
import { TransactionManager } from '@/domain/shared/transaction-manager.interface';
import { PropertyTypeEnum } from '@/domain/property/value-objects/property-type.vo';
import { createPropertyRepositoryMock } from '@test/shared/mocks/repositories/property-repository.mock';
import { createUnitRepositoryMock } from '@test/shared/mocks/repositories/unit-repository.mock';
import { createTenantRepositoryMock } from '@test/shared/mocks/repositories/tenant-repository.mock';
import { createTransactionManagerMock } from '@test/shared/mocks/services/transaction-manager.mock';
import { createEventEmitterMock } from '@test/shared/mocks/services/event-emitter.mock';
import { makeTenant } from '@test/shared/fixtures/tenant.fixture';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const PROPERTY_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000';
const UNIT_ID = 'unit-456';

function makeCommand(
  overrides?: Partial<CreatePropertyCommand>,
): CreatePropertyCommand {
  return new CreatePropertyCommand(
    '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
    'Casa del lago',
    'Una hermosa casa',
    overrides?.propertyType ?? PropertyTypeEnum.CASA,
    'Calle 123',
    'Bogotá',
    'Cundinamarca',
    'Colombia',
    '110111',
    { lat: 4.6097, lng: -74.0817 },
    '15:00',
    '11:00',
    'FLEXIBLE',
    '+573001234567',
    'host@example.com',
    overrides?.autoCreateUnit ?? false,
    '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000',
    'owner@example.com',
  );
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CreatePropertyHandler', () => {
  let handler: CreatePropertyHandler;
  let propertyRepository: jest.Mocked<PropertyRepository>;
  let unitRepository: jest.Mocked<UnitRepository>;
  let tenantRepository: jest.Mocked<TenantRepository>;
  let transactionManager: jest.Mocked<TransactionManager>;
  let eventEmitter: ReturnType<typeof createEventEmitterMock>;

  beforeEach(() => {
    propertyRepository = createPropertyRepositoryMock();
    unitRepository = createUnitRepositoryMock();
    tenantRepository = createTenantRepositoryMock();
    transactionManager = createTransactionManagerMock();
    eventEmitter = createEventEmitterMock();

    handler = new CreatePropertyHandler(
      propertyRepository,
      unitRepository,
      tenantRepository,
      transactionManager,
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

  describe('when plan limit is reached', () => {
    it('throws ForbiddenException', async () => {
      tenantRepository.findById.mockResolvedValue(makeTenant());
      propertyRepository.countByTenantId.mockResolvedValue(1);
      unitRepository.countByTenantId.mockResolvedValue(1);
      // TRIAL plan has a siteLimit of 2, so 1 + 1 = 2 >= 2

      await expect(handler.execute(makeCommand())).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('when autoCreateUnit is false', () => {
    it('saves property only and returns propertyId', async () => {
      tenantRepository.findById.mockResolvedValue(makeTenant());
      propertyRepository.countByTenantId.mockResolvedValue(0);
      unitRepository.countByTenantId.mockResolvedValue(0);
      propertyRepository.save.mockResolvedValue(PROPERTY_ID);

      const result = await handler.execute(
        makeCommand({ autoCreateUnit: false }),
      );

      expect(result).toBeInstanceOf(CreatePropertyResult);
      expect(result.propertyId).toBe(PROPERTY_ID);
      expect(result.unitId).toBeUndefined();
    });

    it('emits PROPERTY_CREATED audit event', async () => {
      tenantRepository.findById.mockResolvedValue(makeTenant());
      propertyRepository.countByTenantId.mockResolvedValue(0);
      unitRepository.countByTenantId.mockResolvedValue(0);
      propertyRepository.save.mockResolvedValue(PROPERTY_ID);

      await handler.execute(makeCommand({ autoCreateUnit: false }));

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ entityType: 'PROPERTY' }),
      );
    });
  });

  describe('when autoCreateUnit is true and property type supports it', () => {
    it('saves property and unit in a transaction and returns both ids', async () => {
      tenantRepository.findById.mockResolvedValue(makeTenant());
      propertyRepository.countByTenantId.mockResolvedValue(0);
      unitRepository.countByTenantId.mockResolvedValue(0);
      propertyRepository.save.mockResolvedValue(PROPERTY_ID);
      unitRepository.save.mockResolvedValue(UNIT_ID);

      const result = await handler.execute(
        makeCommand({
          autoCreateUnit: true,
          propertyType: PropertyTypeEnum.CASA,
        }),
      );

      expect(result).toBeInstanceOf(CreatePropertyResult);
      expect(result.propertyId).toBe(PROPERTY_ID);
      expect(result.unitId).toBe(UNIT_ID);
    });

    it('emits PROPERTY_CREATED and UNIT_CREATED audit events', async () => {
      tenantRepository.findById.mockResolvedValue(makeTenant());
      propertyRepository.countByTenantId.mockResolvedValue(0);
      unitRepository.countByTenantId.mockResolvedValue(0);
      propertyRepository.save.mockResolvedValue(PROPERTY_ID);
      unitRepository.save.mockResolvedValue(UNIT_ID);

      await handler.execute(
        makeCommand({
          autoCreateUnit: true,
          propertyType: PropertyTypeEnum.CASA,
        }),
      );

      expect(eventEmitter.emit).toHaveBeenCalledTimes(3);
    });
  });

  describe('when autoCreateUnit is true but property type does not support it', () => {
    it('saves property only and returns propertyId', async () => {
      tenantRepository.findById.mockResolvedValue(makeTenant());
      propertyRepository.countByTenantId.mockResolvedValue(0);
      unitRepository.countByTenantId.mockResolvedValue(0);
      propertyRepository.save.mockResolvedValue(PROPERTY_ID);

      const result = await handler.execute(
        makeCommand({
          autoCreateUnit: true,
          propertyType: PropertyTypeEnum.HOTEL,
        }),
      );

      expect(result).toBeInstanceOf(CreatePropertyResult);
      expect(result.propertyId).toBe(PROPERTY_ID);
      expect(result.unitId).toBeUndefined();
    });
  });
});
