import { GuestPreferenceCategoryEnum } from '@/domain/guest-preference/value-objects/guest-preference-category.vo';

export class UpdateCustomCatalogItemCommand {
  constructor(
    public readonly tenantId: string,
    public readonly activePlan: string,
    public readonly itemId: string,
    public readonly label: string,
    public readonly category: GuestPreferenceCategoryEnum,
    public readonly actorId: string,
    public readonly actorEmail: string,
  ) {}
}
