import { NotFoundException } from '@nestjs/common';
import { GetTenantProfileQueryHandler } from '@/application/tenant/queries/GetTenantProfile/get-tenant-profile.query-handler';
import { GetTenantProfileQuery } from '@/application/tenant/queries/GetTenantProfile/get-tenant-profile.query';
import { GetTenantProfileResult } from '@/application/tenant/queries/GetTenantProfile/get-tenant-profile.result';
import { TenantRepository } from '@/domain/tenant/repositories/tenant.repository';
import { createTenantRepositoryMock } from '@test/shared/mocks/repositories/tenant-repository.mock';
import {
  makeTenant,
  TENANT_FIXTURE_DEFAULTS,
} from '@test/shared/fixtures/tenant.fixture';

describe('GetTenantProfileQueryHandler', () => {
  let handler: GetTenantProfileQueryHandler;
  let tenantRepository: jest.Mocked<TenantRepository>;
  let storageService: { getPublicUrl: jest.Mock };

  beforeEach(() => {
    tenantRepository = createTenantRepositoryMock();
    storageService = {
      getPublicUrl: jest.fn((key: string) => `https://cdn.test/${key}`),
    };
    handler = new GetTenantProfileQueryHandler(
      tenantRepository,
      storageService as any,
    );
  });

  describe('when the tenant does not exist', () => {
    it('throws NotFoundException', async () => {
      tenantRepository.findById.mockResolvedValue(null);

      await expect(
        handler.execute(new GetTenantProfileQuery('non-existent')),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('when the tenant exists', () => {
    it('returns GetTenantProfileResult with profile data', async () => {
      tenantRepository.findById.mockResolvedValue(makeTenant());

      const result = await handler.execute(
        new GetTenantProfileQuery(TENANT_FIXTURE_DEFAULTS.id),
      );

      expect(result).toBeInstanceOf(GetTenantProfileResult);
      expect(result.profile.id).toBe(TENANT_FIXTURE_DEFAULTS.id);
      expect(result.profile.name).toBe(TENANT_FIXTURE_DEFAULTS.name);
      expect(result.profile.ownerEmail).toBe(
        TENANT_FIXTURE_DEFAULTS.ownerEmail,
      );
      expect(result.profile.emailVerified).toBe(
        TENANT_FIXTURE_DEFAULTS.emailVerified,
      );
    });

    it('builds logoUrl from the stored key', async () => {
      tenantRepository.findById.mockResolvedValue(
        makeTenant({ logoKey: 'tenants/abc/logo/1.png' }),
      );

      const result = await handler.execute(
        new GetTenantProfileQuery(TENANT_FIXTURE_DEFAULTS.id),
      );

      expect(storageService.getPublicUrl).toHaveBeenCalledWith(
        'tenants/abc/logo/1.png',
      );
      expect(result.profile.logoUrl).toBe(
        'https://cdn.test/tenants/abc/logo/1.png',
      );
    });

    it('returns null logoUrl when no key is stored', async () => {
      tenantRepository.findById.mockResolvedValue(makeTenant({ logoKey: null }));

      const result = await handler.execute(
        new GetTenantProfileQuery(TENANT_FIXTURE_DEFAULTS.id),
      );

      expect(storageService.getPublicUrl).not.toHaveBeenCalled();
      expect(result.profile.logoUrl).toBeNull();
    });
  });
});
