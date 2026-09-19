import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UpdateTenantProfileHandler } from '@/application/tenant/commands/update-tenant-profile.handler';
import { UpdateTenantProfileCommand } from '@/application/tenant/commands/update-tenant-profile.command';
import { UpdateTenantProfileResult } from '@/application/tenant/commands/update-tenant-profile.result';
import { TenantRepository } from '@/domain/tenant/repositories/tenant.repository';
import { createTenantRepositoryMock } from '@test/shared/mocks/repositories/tenant-repository.mock';
import { createEventEmitterMock } from '@test/shared/mocks/services/event-emitter.mock';
import {
  makeTenant,
  TENANT_FIXTURE_DEFAULTS,
} from '@test/shared/fixtures/tenant.fixture';

describe('UpdateTenantProfileHandler', () => {
  let handler: UpdateTenantProfileHandler;
  let tenantRepository: jest.Mocked<TenantRepository>;
  let storageService: { deleteObjects: jest.Mock };
  let eventEmitter: ReturnType<typeof createEventEmitterMock>;

  beforeEach(() => {
    tenantRepository = createTenantRepositoryMock();
    storageService = { deleteObjects: jest.fn() };
    eventEmitter = createEventEmitterMock();

    handler = new UpdateTenantProfileHandler(
      tenantRepository,
      storageService as any,
      eventEmitter as any,
    );
  });

  describe('when the tenant does not exist', () => {
    it('throws NotFoundException', async () => {
      tenantRepository.findById.mockResolvedValue(null);

      await expect(
        handler.execute(
          new UpdateTenantProfileCommand(
            'non-existent',
            'New Name',
            null,
            null,
            null,
            null,
            null,
            '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000',
            'owner@example.com',
          ), // (id, name, contactPhone, address, description, theme, logoKey, actorId, actorEmail)
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('when the tenant exists', () => {
    it('updates the profile, saves, and emits audit event', async () => {
      tenantRepository.findById.mockResolvedValue(makeTenant());

      const result = await handler.execute(
        new UpdateTenantProfileCommand(
          TENANT_FIXTURE_DEFAULTS.id,
          'Updated Corp',
          '+573009999999',
          'New Address 456',
          'An updated description',
          { primary: '#1A73E8' },
          undefined,
          '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000',
          'owner@example.com',
        ),
      );

      expect(result).toBeInstanceOf(UpdateTenantProfileResult);
      expect(result.tenantId).toBe(TENANT_FIXTURE_DEFAULTS.id);
      expect(tenantRepository.save).toHaveBeenCalledTimes(1);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ entityType: 'TENANT' }),
      );
    });

    it('rejects a logo key outside the tenant own prefix', async () => {
      tenantRepository.findById.mockResolvedValue(makeTenant());

      await expect(
        handler.execute(
          new UpdateTenantProfileCommand(
            TENANT_FIXTURE_DEFAULTS.id,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            'someone-else/logos/1.png',
            '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000',
            'owner@example.com',
          ),
        ),
      ).rejects.toThrow(BadRequestException);
      expect(tenantRepository.save).not.toHaveBeenCalled();
    });

    it('deletes the previous logo when the key changes', async () => {
      const oldKey = `${TENANT_FIXTURE_DEFAULTS.id}/logos/old.png`;
      const newKey = `${TENANT_FIXTURE_DEFAULTS.id}/logos/new.png`;
      tenantRepository.findById.mockResolvedValue(
        makeTenant({ logoKey: oldKey }),
      );

      await handler.execute(
        new UpdateTenantProfileCommand(
          TENANT_FIXTURE_DEFAULTS.id,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          newKey,
          '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000',
          'owner@example.com',
        ),
      );

      expect(storageService.deleteObjects).toHaveBeenCalledWith([oldKey]);
    });
  });
});
