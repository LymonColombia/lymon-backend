import { Email } from '@/domain/shared/value-objects/email.vo';
import { createSlug } from '@/domain/shared/utils/slug.util';
import { PlanType } from '@/domain/tenant/value-objects/plan-type.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { TenantTheme } from '@/domain/tenant/value-objects/tenant-theme';

export interface TenantReconstitutionProps {
  id: TenantId;
  name: string;
  slug?: string;
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
  deletedAt?: Date | null;
  trialEndsAt?: Date | null;
}

export class Tenant {
  private constructor(
    private readonly id: TenantId | null,
    private name: string,
    private slug: string,
    private readonly ownerEmail: Email,
    private plan: PlanType,
    private emailVerified: boolean,
    private contactPhone: string | null,
    private address: string | null,
    private description: string | null,
    private logoKey: string | null,
    private theme: TenantTheme | null,
    private readonly createdAt: Date,
    private updatedAt: Date,
    private deletedAt: Date | null = null,
    private trialEndsAt: Date | null = null,
  ) {}

  static create(name: string, ownerEmail: Email, plan: PlanType): Tenant {
    if (!name || name.trim() === '') {
      throw new Error('Tenant name cannot be empty');
    }

    const trialEndsAt = plan.isTrial()
      ? new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
      : null;

    return new Tenant(
      null,
      name.trim(),
      createSlug(name),
      ownerEmail,
      plan,
      false,
      null,
      null,
      null,
      null,
      null,
      new Date(),
      new Date(),
      null,
      trialEndsAt,
    );
  }

  static reconstitute(props: TenantReconstitutionProps): Tenant {
    return new Tenant(
      props.id,
      props.name,
      props.slug ?? createSlug(props.name),
      props.ownerEmail,
      props.plan,
      props.emailVerified,
      props.contactPhone,
      props.address,
      props.description,
      props.logoKey,
      props.theme,
      props.createdAt,
      props.updatedAt,
      props.deletedAt,
      props.trialEndsAt,
    );
  }

  delete(): void {
    this.deletedAt = new Date();
    this.updatedAt = new Date();
  }

  isDeleted(): boolean {
    return this.deletedAt !== null;
  }

  getDeletedAt(): Date | null {
    return this.deletedAt;
  }

  verifyEmail(): void {
    this.emailVerified = true;
    this.updatedAt = new Date();
  }

  isEmailVerified(): boolean {
    return this.emailVerified;
  }

  changePlan(newPlan: PlanType): void {
    this.plan = newPlan;
    this.updatedAt = new Date();
  }

  updateProfile(
    name?: string,
    contactPhone?: string | null,
    address?: string | null,
    description?: string | null,
    theme?: TenantTheme | null,
    logoKey?: string | null,
  ): void {
    if (name !== undefined) {
      if (!name || name.trim() === '') {
        throw new Error('Tenant name cannot be empty');
      }
      this.name = name.trim();
      this.slug = createSlug(this.name);
    }
    if (contactPhone !== undefined) this.contactPhone = contactPhone;
    if (address !== undefined) this.address = address;
    if (description !== undefined) this.description = description;
    if (theme !== undefined) this.theme = theme;
    if (logoKey !== undefined) this.logoKey = logoKey;
    this.updatedAt = new Date();
  }

  getId(): TenantId | null {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getSlug(): string {
    return this.slug;
  }

  getContactPhone(): string | null {
    return this.contactPhone;
  }

  getAddress(): string | null {
    return this.address;
  }

  getDescription(): string | null {
    return this.description;
  }

  getLogoKey(): string | null {
    return this.logoKey;
  }

  getTheme(): TenantTheme | null {
    return this.theme;
  }

  getOwnerEmail(): Email {
    return this.ownerEmail;
  }

  getPlan(): PlanType {
    return this.plan;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  getTrialEndsAt(): Date | null {
    return this.trialEndsAt;
  }

  isTrialExpired(): boolean {
    return this.trialEndsAt !== null && this.trialEndsAt.getTime() < Date.now();
  }

  getTrialDaysRemaining(): number | null {
    if (this.trialEndsAt === null) {
      return null;
    }
    const msRemaining = this.trialEndsAt.getTime() - Date.now();
    return Math.max(0, Math.ceil(msRemaining / (24 * 60 * 60 * 1000)));
  }
}
