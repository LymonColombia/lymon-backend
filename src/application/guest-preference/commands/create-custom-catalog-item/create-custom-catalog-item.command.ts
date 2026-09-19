import { GuestPreferenceCategoryEnum } from '@/domain/guest-preference/value-objects/guest-preference-category.vo';

export class CreateCustomCatalogItemCommand {
  constructor(
    public readonly tenantId: string,
    public readonly activePlan: string,
    public readonly category: GuestPreferenceCategoryEnum,
    public readonly label: string,
    public readonly actorId: string,
    public readonly actorEmail: string,
  ) {}
}
