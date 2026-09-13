import {
  Tenant,
  TenantReconstitutionProps,
} from '@/domain/tenant/entities/tenant.entity';
import { TenantTheme } from '@/domain/tenant/value-objects/tenant-theme';
import { Email } from '@/domain/shared/value-objects/email.vo';
import {
  PlanType,
  PlanTypeEnum,
} from '@/domain/tenant/value-objects/plan-type.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

export const TENANT_FIXTURE_DEFAULTS = {
  id: '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
  name: 'Acme Corp',
  ownerEmail: 'owner@example.com',
  plan: PlanTypeEnum.TRIAL,
  emailVerified: true,
  contactPhone: null as string | null,
  address: null as string | null,
  description: null as string | null,
  logoKey: null as string | null,
  theme: null as TenantTheme | null,
  website: null as string | null,
  logoUrl: null as string | null,
  trialEndsAt: null as Date | null,
};

export function makeTenant(
  overrides?: Partial<{
    id: string;
    name: string;
    ownerEmail: string;
    plan: PlanTypeEnum;
    emailVerified: boolean;
    contactPhone: string | null;
    address: string | null;
    description: string | null;
    logoKey: string | null;
    theme: TenantTheme | null;
    website: string | null;
    logoUrl: string | null;
    trialEndsAt: Date | null;
  }>,
): Tenant {
  const merged = { ...TENANT_FIXTURE_DEFAULTS, ...overrides };
  const props: TenantReconstitutionProps = {
    id: TenantId.createFromString(merged.id),
    name: merged.name,
    ownerEmail: Email.create(merged.ownerEmail),
    plan: PlanType.create(merged.plan),
    emailVerified: merged.emailVerified,
    contactPhone: merged.contactPhone,
    address: merged.address,
    description: merged.description,
    logoKey: merged.logoKey,
    theme: merged.theme,
    createdAt: new Date(),
    updatedAt: new Date(),
    trialEndsAt: merged.trialEndsAt,
  };
  return Tenant.reconstitute(props);
}
