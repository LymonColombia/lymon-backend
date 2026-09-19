import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import {
  CreateGuestParams,
  GuestIdentity,
  GuestStatusEnum,
  GuestSummary,
} from '@/domain/guest/entities/guest.types';
import { GuestTag } from '@/domain/guest-tag/entities/guest-tag.entity';
import { IGuestData } from '../interfaces/guest.interface';
import { GuestPreferenceItem } from '@/domain/guest/value-objects/guest-preference-item.vo';

export class Guest {
  private constructor(
    private readonly id: GuestId | null,
    private readonly tenantId: TenantId,
    private guestAccountId: GuestAccountId | null,
    private identity: GuestIdentity,
    private firstName: string | null,
    private lastName: string | null,
    private fullName: string,
    private primaryEmail: string,
    private phone: string | null,
    private status: GuestStatusEnum,
    private tags: GuestTag[],
    private preferences: GuestPreferenceItem[],
    private summary: GuestSummary,
    private readonly createdAt: Date,
    private updatedAt: Date,
    private pendingEmail: string | null,
    private emailChangeToken: string | null,
    private emailChangeExpiry: Date | null,
  ) {}

  static create(params: CreateGuestParams): Guest {
    const fullName = params.fullName?.trim();
    if (!fullName) {
      throw new Error('Guest fullName is required');
    }

    const primaryEmail = Guest.normalizeEmail(params.primaryEmail);

    return new Guest(
      null,
      params.tenantId,
      params.guestAccountId ?? null,
      params.identity,
      Guest.normalizeOptionalString(params.firstName),
      Guest.normalizeOptionalString(params.lastName),
      fullName,
      primaryEmail,
      params.phone ?? null,
      params.status ?? GuestStatusEnum.ACTIVE,
      [],
      params.preferences ?? [],
      {
        totalBookings: 0,
        totalNights: 0,
        totalSpend: 0,
        lastStayAt: null,
        lastPropertyId: null,
        lastUnitId: null,
      },
      new Date(),
      new Date(),
      null,
      null,
      null,
    );
  }

  static reconstitute(data: IGuestData): Guest {
    return new Guest(
      data.id,
      data.tenantId,
      data.guestAccountId,
      data.identity,
      data.firstName,
      data.lastName,
      data.fullName,
      Guest.normalizeEmail(data.primaryEmail),
      data.phone,
      data.status,
      Guest.uniqueTags(data.tags),
      data.preferences,
      data.summary,
      data.createdAt,
      data.updatedAt,
      data.pendingEmail ?? null,
      data.emailChangeToken ?? null,
      data.emailChangeExpiry ?? null,
    );
  }

  updateBasicInfo(
    fullName: string,
    firstName?: string | null,
    lastName?: string | null,
  ): void {
    const normalizedFullName = fullName.trim();
    if (!normalizedFullName) {
      throw new Error('Guest fullName is required');
    }

    this.fullName = normalizedFullName;
    this.firstName = Guest.normalizeOptionalString(firstName);
    this.lastName = Guest.normalizeOptionalString(lastName);
    this.touch();
  }

  setPrimaryEmail(primaryEmail: string): void {
    this.primaryEmail = Guest.normalizeEmail(primaryEmail);
    this.touch();
  }

  setPhone(phone: string | null): void {
    this.phone = phone;
    this.touch();
  }

  setIdentity(identity: GuestIdentity): void {
    this.identity = identity;
    this.touch();
  }

  setStatus(status: GuestStatusEnum): void {
    this.status = status;
    this.touch();
  }

  setTags(tags: GuestTag[]): void {
    this.tags = Guest.uniqueTags(tags);
    this.touch();
  }

  setPreferences(items: GuestPreferenceItem[]): void {
    this.preferences = items;
    this.touch();
  }

  linkToGuestAccount(guestAccountId: GuestAccountId): void {
    this.guestAccountId = guestAccountId;
    this.touch();
  }

  updateCrmSummary(summary: GuestSummary): void {
    if (
      summary.totalBookings < 0 ||
      summary.totalNights < 0 ||
      summary.totalSpend < 0
    ) {
      throw new Error('CRM summary values cannot be negative');
    }

    this.summary = summary;
    this.touch();
  }

  initEmailChange(pendingEmail: string, hashedToken: string, expiry: Date): void {
    this.pendingEmail = Guest.normalizeEmail(pendingEmail);
    this.emailChangeToken = hashedToken;
    this.emailChangeExpiry = expiry;
    this.touch();
  }

  getPendingEmail(): string | null {
    return this.pendingEmail;
  }

  getEmailChangeToken(): string | null {
    return this.emailChangeToken;
  }

  getEmailChangeExpiry(): Date | null {
    return this.emailChangeExpiry;
  }

  isEmailChangeTokenValid(now: Date): boolean {
    return (
      this.pendingEmail !== null &&
      this.emailChangeExpiry !== null &&
      this.emailChangeExpiry > now
    );
  }

  confirmEmailChange(): void {
    if (!this.pendingEmail) return;
    this.setPrimaryEmail(this.pendingEmail);
    this.pendingEmail = null;
    this.emailChangeToken = null;
    this.emailChangeExpiry = null;
  }

  clearEmailChange(): void {
    this.pendingEmail = null;
    this.emailChangeToken = null;
    this.emailChangeExpiry = null;
    this.touch();
  }

  getId(): GuestId | null {
    return this.id;
  }

  getTenantId(): TenantId {
    return this.tenantId;
  }

  getGuestAccountId(): GuestAccountId | null {
    return this.guestAccountId;
  }

  getIdentity(): GuestIdentity {
    return this.identity;
  }

  getFirstName(): string | null {
    return this.firstName;
  }

  getLastName(): string | null {
    return this.lastName;
  }

  getFullName(): string {
    return this.fullName;
  }

  getPrimaryEmail(): string {
    return this.primaryEmail;
  }

  getPhone(): string | null {
    return this.phone;
  }

  getStatus(): GuestStatusEnum {
    return this.status;
  }

  getTags(): GuestTag[] {
    return [...this.tags];
  }

  getPreferences(): GuestPreferenceItem[] {
    return [...this.preferences];
  }

  getSummary(): GuestSummary {
    return this.summary;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  private touch(): void {
    this.updatedAt = new Date();
  }

  private static normalizeEmail(email: string): string {
    const normalized = email?.trim().toLowerCase();
    if (!normalized) {
      throw new Error('Guest primaryEmail is required');
    }

    return normalized;
  }

  private static uniqueTags(tags: GuestTag[]): GuestTag[] {
    const seen = new Set<string>();
    return tags.filter((t) => {
      const name = t.getName();
      if (seen.has(name)) return false;
      seen.add(name);
      return true;
    });
  }

  private static normalizeOptionalString(value?: string | null): string | null {
    if (!value) return null;

    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }
}
