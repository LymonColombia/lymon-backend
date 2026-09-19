import { Email } from '@/domain/shared/value-objects/email.vo';
import { PlanType } from '@/domain/tenant/value-objects/plan-type.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { TenantTheme } from '@/domain/tenant/value-objects/tenant-theme';

export interface ITenant {
  id: TenantId;
  name: string;
  ownerEmail: Email;
  plan: PlanType;
  emailVerified: boolean;
  contactPhone: string | null;
  address: string | null;
  description: string | null;
  logoKey: string | null;
  theme: TenantTheme | null;
  createdAt: Date;
  updatedAt: Date;
}
