import { PlanTypeEnum } from '@/domain/tenant/value-objects/plan-type.vo';

export const PLANS_WITH_CUSTOM_CATALOG = new Set<string>([
  PlanTypeEnum.LYMON_PLUS,
  PlanTypeEnum.LYMON_PRIME,
]);
