import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  TENANT_REGISTERED_EVENT,
  TenantRegisteredEvent,
} from '@/application/tenant/events/tenant-registered.event';
import {
  GUEST_PREFERENCE_CATALOG_REPOSITORY,
  type GuestPreferenceCatalogRepository,
} from '@/domain/guest-preference/repositories/guest-preference-catalog.repository';
import {
  GuestPreferenceCatalogItem,
  GuestPreferenceSourceEnum,
} from '@/domain/guest-preference/entities/guest-preference-catalog-item.entity';
import { GuestPreferenceCategoryEnum } from '@/domain/guest-preference/value-objects/guest-preference-category.vo';
import { GuestPreferencePredefinedKeyEnum } from '@/domain/guest-preference/value-objects/guest-preference-predefined-key.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

interface PredefinedItemSeed {
  key: GuestPreferencePredefinedKeyEnum;
  category: GuestPreferenceCategoryEnum;
}

const PREDEFINED_CATALOG: PredefinedItemSeed[] = [
  // Dietary
  {
    key: GuestPreferencePredefinedKeyEnum.VEGAN,
    category: GuestPreferenceCategoryEnum.DIETARY,
  },
  {
    key: GuestPreferencePredefinedKeyEnum.VEGETARIAN,
    category: GuestPreferenceCategoryEnum.DIETARY,
  },
  {
    key: GuestPreferencePredefinedKeyEnum.GLUTEN_FREE,
    category: GuestPreferenceCategoryEnum.DIETARY,
  },
  {
    key: GuestPreferencePredefinedKeyEnum.LOW_SUGAR,
    category: GuestPreferenceCategoryEnum.DIETARY,
  },
  {
    key: GuestPreferencePredefinedKeyEnum.NUT_ALLERGY,
    category: GuestPreferenceCategoryEnum.DIETARY,
  },
  {
    key: GuestPreferencePredefinedKeyEnum.LACTOSE_FREE,
    category: GuestPreferenceCategoryEnum.DIETARY,
  },
  {
    key: GuestPreferencePredefinedKeyEnum.HALAL,
    category: GuestPreferenceCategoryEnum.DIETARY,
  },
  {
    key: GuestPreferencePredefinedKeyEnum.KOSHER,
    category: GuestPreferenceCategoryEnum.DIETARY,
  },

  // Room
  {
    key: GuestPreferencePredefinedKeyEnum.HIGH_FLOOR,
    category: GuestPreferenceCategoryEnum.ROOM,
  },
  {
    key: GuestPreferencePredefinedKeyEnum.LOW_FLOOR,
    category: GuestPreferenceCategoryEnum.ROOM,
  },
  {
    key: GuestPreferencePredefinedKeyEnum.QUIET_ROOM,
    category: GuestPreferenceCategoryEnum.ROOM,
  },
  {
    key: GuestPreferencePredefinedKeyEnum.SMOKING,
    category: GuestPreferenceCategoryEnum.ROOM,
  },
  {
    key: GuestPreferencePredefinedKeyEnum.NON_SMOKING,
    category: GuestPreferenceCategoryEnum.ROOM,
  },
  {
    key: GuestPreferencePredefinedKeyEnum.EXTRA_PILLOWS,
    category: GuestPreferenceCategoryEnum.ROOM,
  },
  {
    key: GuestPreferencePredefinedKeyEnum.FOAM_PILLOW,
    category: GuestPreferenceCategoryEnum.ROOM,
  },
  {
    key: GuestPreferencePredefinedKeyEnum.FEATHER_PILLOW,
    category: GuestPreferenceCategoryEnum.ROOM,
  },
  {
    key: GuestPreferencePredefinedKeyEnum.EXTRA_BLANKET,
    category: GuestPreferenceCategoryEnum.ROOM,
  },

  // Accessibility
  {
    key: GuestPreferencePredefinedKeyEnum.HANDICAP_ACCESSIBLE,
    category: GuestPreferenceCategoryEnum.ACCESSIBILITY,
  },
  {
    key: GuestPreferencePredefinedKeyEnum.WHEELCHAIR_ACCESSIBLE,
    category: GuestPreferenceCategoryEnum.ACCESSIBILITY,
  },
  {
    key: GuestPreferencePredefinedKeyEnum.ROLL_IN_SHOWER,
    category: GuestPreferenceCategoryEnum.ACCESSIBILITY,
  },
  {
    key: GuestPreferencePredefinedKeyEnum.GRAB_BARS,
    category: GuestPreferenceCategoryEnum.ACCESSIBILITY,
  },
  {
    key: GuestPreferencePredefinedKeyEnum.VISUAL_ALERTS,
    category: GuestPreferenceCategoryEnum.ACCESSIBILITY,
  },
];

@Injectable()
export class TenantRegisteredCatalogSeedListener {
  private readonly logger = new Logger(
    TenantRegisteredCatalogSeedListener.name,
  );

  constructor(
    @Inject(GUEST_PREFERENCE_CATALOG_REPOSITORY)
    private readonly repository: GuestPreferenceCatalogRepository,
  ) {}

  @OnEvent(TENANT_REGISTERED_EVENT)
  async handle(event: TenantRegisteredEvent): Promise<void> {
    const tenantId = TenantId.createFromString(event.tenantId);

    try {
      await Promise.all(
        PREDEFINED_CATALOG.map((seed) => {
          const item = GuestPreferenceCatalogItem.create({
            tenantId,
            category: seed.category,
            source: GuestPreferenceSourceEnum.PREDEFINED,
            key: seed.key,
          });
          return this.repository.save(item);
        }),
      );

      this.logger.log(
        `Seeded ${PREDEFINED_CATALOG.length} predefined catalog items for tenant ${event.tenantId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to seed catalog items for tenant ${event.tenantId}`,
        error,
      );
    }
  }
}
