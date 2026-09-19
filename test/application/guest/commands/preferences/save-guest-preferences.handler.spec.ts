import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SaveGuestPreferencesHandler } from '@/application/guest/commands/preferences/save-guest-preferences.handler';
import { SaveGuestPreferencesCommand } from '@/application/guest/commands/preferences/save-guest-preferences.command';
import { SaveGuestPreferencesResult } from '@/application/guest/commands/preferences/save-guest-preferences.result';
import { GuestRepository } from '@/domain/guest/repositories/guest.repository';
import { CatalogPreferenceBuilderService } from '@/application/guest-preference/services/catalog-preference-builder.service';
import { PlanTypeEnum } from '@/domain/tenant/value-objects/plan-type.vo';
import { createGuestRepositoryMock } from '@test/shared/mocks/repositories/guest-repository.mock';
import { createCatalogPreferenceBuilderMock } from '@test/shared/mocks/services/catalog-preference-builder.mock';
import {
  makeGuest,
  GUEST_FIXTURE_DEFAULTS,
} from '@test/shared/fixtures/guest.fixture';
import { GuestPreferenceCategoryEnum } from '@/domain/guest-preference/value-objects/guest-preference-category.vo';
import { GuestPreferenceItem } from '@/domain/guest/value-objects/guest-preference-item.vo';

const GUEST_ID = GUEST_FIXTURE_DEFAULTS.id;
const TENANT_ID = 'tenant-xyz-456';

const CATALOG_ITEM_ID_1 = 'item-001';
const CATALOG_ITEM_ID_2 = 'item-002';

const BUILT_PREFERENCE_1: GuestPreferenceItem = {
  catalogItemId: CATALOG_ITEM_ID_1,
  labelSnapshot: 'Piso alto',
  category: GuestPreferenceCategoryEnum.ROOM,
};

const BUILT_PREFERENCE_2: GuestPreferenceItem = {
  catalogItemId: CATALOG_ITEM_ID_2,
  labelSnapshot: 'Habitación silenciosa',
  category: GuestPreferenceCategoryEnum.ROOM,
};

function makeCommand(
  overrides: Partial<{
    tenantId: string;
    guestId: string;
    catalogItemIds: string[];
    activePlan: string;
  }> = {},
): SaveGuestPreferencesCommand {
  return new SaveGuestPreferencesCommand(
    overrides.tenantId ?? TENANT_ID,
    overrides.guestId ?? GUEST_ID,
    overrides.catalogItemIds ?? [CATALOG_ITEM_ID_1],
    overrides.activePlan ?? PlanTypeEnum.LYMON_PLUS,
    'actor-id',
    'actor@test.com',
  );
}

describe('SaveGuestPreferencesHandler', () => {
  let handler: SaveGuestPreferencesHandler;
  let guestRepository: jest.Mocked<GuestRepository>;
  let catalogPreferenceBuilder: jest.Mocked<CatalogPreferenceBuilderService>;

  let mockEventEmitter: { emit: jest.Mock };

  beforeEach(() => {
    guestRepository = createGuestRepositoryMock();
    catalogPreferenceBuilder = createCatalogPreferenceBuilderMock();
    mockEventEmitter = { emit: jest.fn() };
    handler = new SaveGuestPreferencesHandler(
      guestRepository,
      catalogPreferenceBuilder,
      mockEventEmitter as any,
    );
  });

  describe('validatePlanAccess — falla rápida sin consulta a BD', () => {
    it.each([PlanTypeEnum.LYMON_ONE, PlanTypeEnum.TRIAL])(
      'lanza ForbiddenException para el plan %s',
      async (plan) => {
        const command = makeCommand({ activePlan: plan });

        await expect(handler.execute(command)).rejects.toThrow(
          ForbiddenException,
        );
        await expect(handler.execute(command)).rejects.toThrow(
          'LYMON_PLUS or LYMON_PRIME plan',
        );
        expect(guestRepository.findById).not.toHaveBeenCalled();
      },
    );
  });

  describe('cuando el guest no existe', () => {
    it('lanza NotFoundException con el ID del guest', async () => {
      guestRepository.findById.mockResolvedValue(null);

      await expect(handler.execute(makeCommand())).rejects.toThrow(
        NotFoundException,
      );
      await expect(handler.execute(makeCommand())).rejects.toThrow(GUEST_ID);
    });
  });

  describe('cuando el guest pertenece a otro tenant', () => {
    it('lanza ForbiddenException sin persistir cambios', async () => {
      const guest = makeGuest({ tenantId: 'otro-tenant-999' });
      guestRepository.findById.mockResolvedValue(guest);

      await expect(handler.execute(makeCommand())).rejects.toThrow(
        ForbiddenException,
      );
      expect(guestRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('happy path — CREATE (primera vez)', () => {
    it('retorna wasCreated:true cuando el guest no tenía preferencias previas', async () => {
      const guest = makeGuest({ tenantId: TENANT_ID, id: GUEST_ID });
      jest.spyOn(guest, 'getPreferences').mockReturnValue([]);
      const setPreferencesSpy = jest.spyOn(guest, 'setPreferences');
      guestRepository.findById.mockResolvedValue(guest);
      guestRepository.save.mockResolvedValue(GUEST_ID);
      catalogPreferenceBuilder.build.mockResolvedValue([BUILT_PREFERENCE_1]);

      const result = await handler.execute(
        makeCommand({ catalogItemIds: [CATALOG_ITEM_ID_1] }),
      );

      expect(catalogPreferenceBuilder.build).toHaveBeenCalledWith(TENANT_ID, [
        CATALOG_ITEM_ID_1,
      ]);
      expect(setPreferencesSpy).toHaveBeenCalledWith([BUILT_PREFERENCE_1]);
      expect(guestRepository.save).toHaveBeenCalledWith(guest);
      expect(result).toBeInstanceOf(SaveGuestPreferencesResult);
      expect(result.guestId).toBe(GUEST_ID);
      expect(result.wasCreated).toBe(true);
    });
  });

  describe('happy path — UPDATE (ya existían preferencias)', () => {
    it('retorna wasCreated:false cuando el guest ya tenía preferencias', async () => {
      const guest = makeGuest({ tenantId: TENANT_ID, id: GUEST_ID });
      jest.spyOn(guest, 'getPreferences').mockReturnValue([BUILT_PREFERENCE_1]);
      const setPreferencesSpy = jest.spyOn(guest, 'setPreferences');
      guestRepository.findById.mockResolvedValue(guest);
      guestRepository.save.mockResolvedValue(GUEST_ID);
      catalogPreferenceBuilder.build.mockResolvedValue([BUILT_PREFERENCE_2]);

      const result = await handler.execute(
        makeCommand({ catalogItemIds: [CATALOG_ITEM_ID_2] }),
      );

      expect(setPreferencesSpy).toHaveBeenCalledWith([BUILT_PREFERENCE_2]);
      expect(guestRepository.save).toHaveBeenCalledWith(guest);
      expect(result).toBeInstanceOf(SaveGuestPreferencesResult);
      expect(result.guestId).toBe(GUEST_ID);
      expect(result.wasCreated).toBe(false);
    });
  });

  describe('snapshot integrity — handler stores what the builder returns', () => {
    it('passes builder output directly to guest.setPreferences without mutation', async () => {
      const guest = makeGuest({ tenantId: TENANT_ID, id: GUEST_ID });
      guestRepository.findById.mockResolvedValue(guest);
      guestRepository.save.mockResolvedValue(GUEST_ID);
      catalogPreferenceBuilder.build.mockResolvedValue([BUILT_PREFERENCE_1]);

      await handler.execute(
        makeCommand({ catalogItemIds: [CATALOG_ITEM_ID_1] }),
      );

      const stored = guest.getPreferences();
      expect(stored[0].labelSnapshot).toBe('Piso alto');
    });
  });
});
