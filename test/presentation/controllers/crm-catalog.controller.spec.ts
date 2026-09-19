import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CrmController } from '@/presentation/controllers/crm.controller';
import { Permission } from '@/domain/role/value-objects/permission.vo';
import { GuestPreferenceCategoryEnum } from '@/domain/guest-preference/value-objects/guest-preference-category.vo';
import { ListCatalogItemsByTenantQuery } from '@/application/guest-preference/queries/list-catalog-items-by-tenant/list-catalog-items-by-tenant.query';
import { CreateCustomCatalogItemCommand } from '@/application/guest-preference/commands/create-custom-catalog-item/create-custom-catalog-item.command';
import { UpdateCustomCatalogItemCommand } from '@/application/guest-preference/commands/update-custom-catalog-item/update-custom-catalog-item.command';
import { DeleteCustomCatalogItemCommand } from '@/application/guest-preference/commands/delete-custom-catalog-item/delete-custom-catalog-item.command';
import { ToggleCatalogItemCommand } from '@/application/guest-preference/commands/toggle-catalog-item/toggle-catalog-item.command';
import { SearchGuestsQuery } from '@/application/guest/queries/search-guests.query';

const TENANT_ID = 'tenant-catalog-test-001';
const ACTIVE_PLAN = 'LYMON_PLUS';
const ITEM_ID = 'catalog-item-001';

const user = {
  userId: 'user-001',
  email: 'manager@test.com',
  tenantId: TENANT_ID,
  activePlan: ACTIVE_PLAN,
  isOwner: false,
  emailVerified: true,
  roleAssignments: [
    {
      roleId: 'r1',
      roleName: 'MANAGER',
      permissions: [Permission.CRM_MANAGE, Permission.CRM_VIEW],
      scope: 'SYSTEM',
    },
  ],
} as any;

describe('CrmController — catalog endpoints', () => {
  let controller: CrmController;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };
  let searchGuestsQuery: { execute: jest.Mock };

  beforeEach(() => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };
    searchGuestsQuery = { execute: jest.fn() };

    controller = new CrmController(
      searchGuestsQuery as unknown as SearchGuestsQuery,
      commandBus as unknown as CommandBus,
      queryBus as unknown as QueryBus,
    );
  });

  // ── GET /crm/catalog ────────────────────────────────────────────────────────

  describe('listCatalogItems', () => {
    it('dispatches ListCatalogItemsByTenantQuery with includeInactive=false by default', async () => {
      queryBus.execute.mockResolvedValue({ items: [] });

      await controller.listCatalogItems(user, false);

      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining<Partial<ListCatalogItemsByTenantQuery>>({
          tenantId: TENANT_ID,
          includeInactive: false,
        }),
      );
    });

    it('dispatches ListCatalogItemsByTenantQuery with includeInactive=true when requested', async () => {
      queryBus.execute.mockResolvedValue({ items: [] });

      await controller.listCatalogItems(user, true);

      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.objectContaining<Partial<ListCatalogItemsByTenantQuery>>({
          tenantId: TENANT_ID,
          includeInactive: true,
        }),
      );
    });

    it('returns items from query result', async () => {
      const items = [{ id: ITEM_ID, label: 'Extra pillows' }];
      queryBus.execute.mockResolvedValue({ items });

      const result = await controller.listCatalogItems(user, false);

      expect(result).toEqual({
        message: 'Catalog items retrieved successfully',
        data: items,
      });
    });

    it('uses tenantId from user, not from any external source', async () => {
      queryBus.execute.mockResolvedValue({ items: [] });
      const otherUser = { ...user, tenantId: 'other-tenant' };

      await controller.listCatalogItems(otherUser, false);

      const dispatched = queryBus.execute.mock
        .calls[0][0] as ListCatalogItemsByTenantQuery;
      expect(dispatched.tenantId).toBe('other-tenant');
    });
  });

  // ── POST /crm/catalog ───────────────────────────────────────────────────────

  describe('createCatalogItem', () => {
    const dto = {
      category: GuestPreferenceCategoryEnum.ROOM,
      label: 'High floor',
    };

    it('dispatches CreateCustomCatalogItemCommand with tenantId and activePlan from user', async () => {
      commandBus.execute.mockResolvedValue(ITEM_ID);

      await controller.createCatalogItem(dto, user);

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining<Partial<CreateCustomCatalogItemCommand>>({
          tenantId: TENANT_ID,
          activePlan: ACTIVE_PLAN,
          category: GuestPreferenceCategoryEnum.ROOM,
          label: 'High floor',
        }),
      );
    });

    it('returns itemId from command result', async () => {
      commandBus.execute.mockResolvedValue(ITEM_ID);

      const result = await controller.createCatalogItem(dto, user);

      expect(result).toEqual({
        message: 'Catalog item created successfully',
        data: { itemId: ITEM_ID },
      });
    });
  });

  // ── PATCH /crm/catalog/:itemId/toggle ───────────────────────────────────────

  describe('toggleCatalogItem', () => {
    it('dispatches ToggleCatalogItemCommand with activate=true', async () => {
      commandBus.execute.mockResolvedValue(undefined);

      await controller.toggleCatalogItem(ITEM_ID, { activate: true }, user);

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining<Partial<ToggleCatalogItemCommand>>({
          tenantId: TENANT_ID,
          itemId: ITEM_ID,
          activate: true,
        }),
      );
    });

    it('dispatches ToggleCatalogItemCommand with activate=false', async () => {
      commandBus.execute.mockResolvedValue(undefined);

      await controller.toggleCatalogItem(ITEM_ID, { activate: false }, user);

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining<Partial<ToggleCatalogItemCommand>>({
          tenantId: TENANT_ID,
          itemId: ITEM_ID,
          activate: false,
        }),
      );
    });

    it('returns success message', async () => {
      commandBus.execute.mockResolvedValue(undefined);

      const result = await controller.toggleCatalogItem(
        ITEM_ID,
        { activate: true },
        user,
      );

      expect(result).toEqual({ message: 'Catalog item toggled successfully' });
    });
  });

  // ── PATCH /crm/catalog/:itemId ──────────────────────────────────────────────

  describe('updateCatalogItem', () => {
    const dto = {
      category: GuestPreferenceCategoryEnum.DIETARY,
      label: 'Vegan',
    };

    it('dispatches UpdateCustomCatalogItemCommand with correct params', async () => {
      commandBus.execute.mockResolvedValue(undefined);

      await controller.updateCatalogItem(ITEM_ID, dto, user);

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining<Partial<UpdateCustomCatalogItemCommand>>({
          tenantId: TENANT_ID,
          activePlan: ACTIVE_PLAN,
          itemId: ITEM_ID,
          label: 'Vegan',
          category: GuestPreferenceCategoryEnum.DIETARY,
        }),
      );
    });

    it('returns success message', async () => {
      commandBus.execute.mockResolvedValue(undefined);

      const result = await controller.updateCatalogItem(ITEM_ID, dto, user);

      expect(result).toEqual({ message: 'Catalog item updated successfully' });
    });
  });

  // ── DELETE /crm/catalog/:itemId ─────────────────────────────────────────────

  describe('deleteCatalogItem', () => {
    it('dispatches DeleteCustomCatalogItemCommand with tenantId and activePlan from user', async () => {
      commandBus.execute.mockResolvedValue(undefined);

      await controller.deleteCatalogItem(ITEM_ID, user);

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining<Partial<DeleteCustomCatalogItemCommand>>({
          tenantId: TENANT_ID,
          activePlan: ACTIVE_PLAN,
          itemId: ITEM_ID,
        }),
      );
    });

    it('returns success message', async () => {
      commandBus.execute.mockResolvedValue(undefined);

      const result = await controller.deleteCatalogItem(ITEM_ID, user);

      expect(result).toEqual({ message: 'Catalog item deleted successfully' });
    });
  });
});
