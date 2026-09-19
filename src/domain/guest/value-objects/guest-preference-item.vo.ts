import { GuestPreferenceCategoryEnum } from '@/domain/guest-preference/value-objects/guest-preference-category.vo';

export interface GuestPreferenceItem {
  catalogItemId: string;
  labelSnapshot: string;
  category: GuestPreferenceCategoryEnum;
}
