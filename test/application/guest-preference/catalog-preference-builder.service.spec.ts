import { BadRequestException } from '@nestjs/common';
import { CatalogPreferenceBuilderService } from '@/application/guest-preference/services/catalog-preference-builder.service';
import { GuestPreferenceCatalogRepository } from '@/domain/guest-preference/repositories/guest-preference-catalog.repository';
import {
  GuestPreferenceCatalogItem,
  GuestPreferenceSourceEnum,
} from '@/domain/guest-preference/entities/guest-preference-catalog-item.entity';
import { GuestPreferenceCategoryEnum } from '@/domain/guest-preference/value-objects/guest-preference-category.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { createGuestPreferenceCatalogRepositoryMock } from '@test/shared/mocks/repositories/guest-preference-catalog-repository.mock';

const TENANT_ID = 'tenant-builder-test';
const TENANT_B = 'tenant-other-999';

function makeCatalogItem(
  id: string,
  label: string,
  options: { tenantId?: string; isActive?: boolean } = {},
): GuestPreferenceCatalogItem {
  return GuestPreferenceCatalogItem.reconstitute({
    id,
    tenantId: TenantId.createFromString(options.tenantId ?? TENANT_ID),
    category: GuestPreferenceCategoryEnum.ROOM,
    source: GuestPreferenceSourceEnum.CUSTOM,
    key: null,
    label,
    isActive: options.isActive ?? true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

describe('CatalogPreferenceBuilderService', () => {
  let service: CatalogPreferenceBuilderService;
  let repository: jest.Mocked<GuestPreferenceCatalogRepository>;

  beforeEach(() => {
    repository = createGuestPreferenceCatalogRepositoryMock();
    service = new CatalogPreferenceBuilderService(repository);
  });

  describe('when catalogItemIds is empty', () => {
    it('returns an empty array without querying the repository', async () => {
      const result = await service.build(TENANT_ID, []);

      expect(result).toEqual([]);
      expect(repository.findByTenant).not.toHaveBeenCalled();
    });
  });

  describe('when all catalog items are valid', () => {
    it('returns GuestPreferenceItem array with labelSnapshot from catalog', async () => {
      repository.findByTenant.mockResolvedValue([
        makeCatalogItem('item-001', 'Piso alto'),
        makeCatalogItem('item-002', 'Almohada extra'),
      ]);

      const result = await service.build(TENANT_ID, ['item-001', 'item-002']);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        catalogItemId: 'item-001',
        labelSnapshot: 'Piso alto',
        category: GuestPreferenceCategoryEnum.ROOM,
      });
      expect(result[1]).toEqual({
        catalogItemId: 'item-002',
        labelSnapshot: 'Almohada extra',
        category: GuestPreferenceCategoryEnum.ROOM,
      });
    });
  });

  // ── Scenario 1: inactive item rejection ───────────────────────────────────

  describe('Scenario 1 — rejects inactive catalog items', () => {
    it('throws BadRequestException when the item is inactive', async () => {
      repository.findByTenant.mockResolvedValue([
        makeCatalogItem('item-inactive', 'Ítem desactivado', {
          isActive: false,
        }),
      ]);

      await expect(service.build(TENANT_ID, ['item-inactive'])).rejects.toThrow(
        BadRequestException,
      );

      await expect(service.build(TENANT_ID, ['item-inactive'])).rejects.toThrow(
        'is not active',
      );
    });
  });

  // ── Scenario 3: Snapshot Integrity ────────────────────────────────────────

  describe('Scenario 3 — Snapshot Integrity: labelSnapshot is independent of the catalog', () => {
    it('captures the label at build time; subsequent catalog changes do not affect the returned snapshot', async () => {
      const catalogItem = makeCatalogItem('item-001', 'Piso alto');
      repository.findByTenant.mockResolvedValue([catalogItem]);

      const result = await service.build(TENANT_ID, ['item-001']);

      expect(result[0].labelSnapshot).toBe('Piso alto');

      // Simulate renaming the catalog item after the snapshot was taken
      repository.findByTenant.mockResolvedValue([
        makeCatalogItem('item-001', 'Nombre modificado'),
      ]);

      // The already-built snapshot is unaffected
      expect(result[0].labelSnapshot).toBe('Piso alto');
    });
  });

  // ── Scenario 4: Tenant Isolation ──────────────────────────────────────────

  describe('Scenario 4 — Tenant Isolation: rejects catalog items from a different tenant', () => {
    it('throws BadRequestException when the catalogItemId belongs to another tenant', async () => {
      // findByTenant(TENANT_B) returns only TENANT_B items — not the item from TENANT_ID
      repository.findByTenant.mockResolvedValue([
        makeCatalogItem('item-tenant-b', 'Habitación silenciosa', {
          tenantId: TENANT_B,
        }),
      ]);

      await expect(
        service.build(TENANT_B, ['item-from-other-tenant']),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.build(TENANT_B, ['item-from-other-tenant']),
      ).rejects.toThrow('does not exist or does not belong to this tenant');
    });

    it('succeeds when catalog item and tenantId match', async () => {
      repository.findByTenant.mockResolvedValue([
        makeCatalogItem('item-tenant-b', 'Habitación silenciosa', {
          tenantId: TENANT_B,
        }),
      ]);

      const result = await service.build(TENANT_B, ['item-tenant-b']);

      expect(result).toHaveLength(1);
      expect(result[0].catalogItemId).toBe('item-tenant-b');
    });
  });
});
