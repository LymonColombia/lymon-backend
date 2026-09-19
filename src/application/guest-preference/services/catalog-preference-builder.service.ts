import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import {
  GUEST_PREFERENCE_CATALOG_REPOSITORY,
  type GuestPreferenceCatalogRepository,
} from '@/domain/guest-preference/repositories/guest-preference-catalog.repository';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import type { GuestPreferenceItem } from '@/domain/guest/value-objects/guest-preference-item.vo';

@Injectable()
export class CatalogPreferenceBuilderService {
  constructor(
    @Inject(GUEST_PREFERENCE_CATALOG_REPOSITORY)
    private readonly catalogRepository: GuestPreferenceCatalogRepository,
  ) {}

  async build(
    tenantId: string,
    catalogItemIds: string[],
  ): Promise<GuestPreferenceItem[]> {
    if (catalogItemIds.length === 0) return [];

    const catalogItems = await this.catalogRepository.findByTenant(
      TenantId.createFromString(tenantId),
    );

    const catalogMap = new Map(
      catalogItems.map((item) => [item.getId()!, item]),
    );

    const result: GuestPreferenceItem[] = [];

    for (const id of catalogItemIds) {
      const catalogItem = catalogMap.get(id);

      if (!catalogItem) {
        throw new BadRequestException(
          `Preference catalog item '${id}' does not exist or does not belong to this tenant`,
        );
      }

      if (!catalogItem.getIsActive()) {
        throw new BadRequestException(
          `Preference catalog item '${id}' is not active`,
        );
      }

      result.push({
        catalogItemId: id,
        labelSnapshot: catalogItem.getLabel() ?? catalogItem.getKey() ?? '',
        category: catalogItem.getCategory(),
      });
    }

    return result;
  }
}
