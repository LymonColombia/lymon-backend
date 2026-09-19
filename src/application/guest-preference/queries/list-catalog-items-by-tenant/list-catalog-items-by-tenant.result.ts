import { GuestPreferenceCategoryEnum } from '@/domain/guest-preference/value-objects/guest-preference-category.vo';
import { GuestPreferencePredefinedKeyEnum } from '@/domain/guest-preference/value-objects/guest-preference-predefined-key.vo';
import { GuestPreferenceSourceEnum } from '@/domain/guest-preference/entities/guest-preference-catalog-item.entity';

export class CatalogItemDto {
  constructor(
    public readonly id: string,
    public readonly tenantId: string,
    public readonly category: GuestPreferenceCategoryEnum,
    public readonly source: GuestPreferenceSourceEnum,
    public readonly key: GuestPreferencePredefinedKeyEnum | null,
    public readonly label: string | null,
    public readonly isActive: boolean,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
  ) {}
}

export class ListCatalogItemsByTenantResult {
  constructor(public readonly items: CatalogItemDto[]) {}
}
