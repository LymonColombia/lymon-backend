import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { GuestAccountStatusEnum } from '@/domain/guest-account/value-objects/guest-account-status.vo';
import { CreateGuestAccountParams } from '@/domain/guest-account/entities/guest-account.types';
import { Email } from '@/domain/shared/value-objects/email.vo';
import { IGuestAccount } from '../interfaces/guest-account.interface';

export class GuestAccount {
  private constructor(
    private readonly id: GuestAccountId | null,
    private email: Email,
    private passwordHash: string,
    private fullName: string,
    private firstName: string | null,
    private lastName: string | null,
    private phone: string | null,
    private status: GuestAccountStatusEnum,
    private emailVerified: boolean,
    private emailVerificationToken: string | null,
    private emailVerificationExpiry: Date | null,
    private passwordResetToken: string | null,
    private passwordResetExpiry: Date | null,
    private passwordChangedAt: Date | null,
    private readonly createdAt: Date,
    private updatedAt: Date,
    private profilePhotoKey: string | null,
    private pendingEmail: Email | null,
    private emailChangeToken: string | null,
    private emailChangeExpiry: Date | null,
  ) {}

  static create(params: CreateGuestAccountParams): GuestAccount {
    const fullName = params.fullName?.trim();
    if (!fullName) {
      throw new Error('GuestAccount fullName is required');
    }

    return new GuestAccount(
      null,
      params.email,
      params.passwordHash,
      fullName,
      params.firstName?.trim() ?? null,
      params.lastName?.trim() ?? null,
      params.phone?.trim() ?? null,
      GuestAccountStatusEnum.PENDING_VERIFICATION,
      false,
      null,
      null,
      null,
      null,
      null,
      new Date(),
      new Date(),
      null,
      null,
      null,
      null,
    );
  }

  static reconstitute(data: IGuestAccount): GuestAccount {
    return new GuestAccount(
      data.id,
      data.email,
      data.passwordHash,
      data.fullName,
      data.firstName,
      data.lastName,
      data.phone,
      data.status,
      data.emailVerified,
      data.emailVerificationToken,
      data.emailVerificationExpiry,
      data.passwordResetToken,
      data.passwordResetExpiry,
      data.passwordChangedAt,
      data.createdAt,
      data.updatedAt,
      data.profilePhotoKey,
      data.pendingEmail,
      data.emailChangeToken,
      data.emailChangeExpiry,
    );
  }

  setEmailVerificationToken(token: string, expiry: Date): void {
    this.emailVerificationToken = token;
    this.emailVerificationExpiry = expiry;
    this.touch();
  }

  verifyEmail(): void {
    this.emailVerified = true;
    this.emailVerificationToken = null;
    this.emailVerificationExpiry = null;
    this.status = GuestAccountStatusEnum.ACTIVE;
    this.touch();
  }

  isEmailVerificationTokenValid(now: Date): boolean {
    if (!this.emailVerificationExpiry) return false;
    return this.emailVerificationExpiry > now;
  }

  setResetToken(hashedToken: string, expiry: Date): void {
    this.passwordResetToken = hashedToken;
    this.passwordResetExpiry = expiry;
    this.touch();
  }

  clearResetToken(): void {
    this.passwordResetToken = null;
    this.passwordResetExpiry = null;
    this.touch();
  }

  isResetTokenValid(now: Date): boolean {
    if (!this.passwordResetExpiry) return false;
    return this.passwordResetExpiry > now;
  }

  resetPassword(newHash: string, changedAt: Date): void {
    this.passwordHash = newHash;
    this.passwordChangedAt = changedAt;
    this.clearResetToken();
  }

  changePassword(newHash: string): void {
    this.passwordHash = newHash;
    this.passwordChangedAt = new Date();
    this.touch();
  }

  updateProfile(
    fullName: string,
    firstName?: string | null,
    lastName?: string | null,
  ): void {
    const normalized = fullName.trim();
    if (!normalized) throw new Error('GuestAccount fullName is required');
    this.fullName = normalized;
    this.firstName = firstName?.trim() ?? null;
    this.lastName = lastName?.trim() ?? null;
    this.touch();
  }

  setFirstName(firstName: string | null): void {
    this.firstName = firstName?.trim() || null;
    this.touch();
  }

  setLastName(lastName: string | null): void {
    this.lastName = lastName?.trim() || null;
    this.touch();
  }

  setPhone(phone: string | null): void {
    this.phone = phone?.trim() || null;
    this.touch();
  }

  initEmailChange(pendingEmail: Email, hashedToken: string, expiry: Date): void {
    this.pendingEmail = pendingEmail;
    this.emailChangeToken = hashedToken;
    this.emailChangeExpiry = expiry;
    this.touch();
  }

  getPendingEmail(): Email | null {
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
    this.email = this.pendingEmail;
    this.pendingEmail = null;
    this.emailChangeToken = null;
    this.emailChangeExpiry = null;
    this.touch();
  }

  clearEmailChange(): void {
    this.pendingEmail = null;
    this.emailChangeToken = null;
    this.emailChangeExpiry = null;
    this.touch();
  }

  suspend(): void {
    this.status = GuestAccountStatusEnum.SUSPENDED;
    this.touch();
  }

  setProfilePhotoKey(key: string | null): void {
    this.profilePhotoKey = key;
    this.touch();
  }

  getProfilePhotoKey(): string | null {
    return this.profilePhotoKey;
  }

  getId(): GuestAccountId | null {
    return this.id;
  }

  getEmail(): Email {
    return this.email;
  }

  getPasswordHash(): string {
    return this.passwordHash;
  }

  getFullName(): string {
    return this.fullName;
  }

  getFirstName(): string | null {
    return this.firstName;
  }

  getPhone(): string | null {
    return this.phone;
  }

  getLastName(): string | null {
    return this.lastName;
  }

  getStatus(): GuestAccountStatusEnum {
    return this.status;
  }

  isEmailVerified(): boolean {
    return this.emailVerified;
  }

  getEmailVerificationToken(): string | null {
    return this.emailVerificationToken;
  }

  getEmailVerificationExpiry(): Date | null {
    return this.emailVerificationExpiry;
  }

  getPasswordResetToken(): string | null {
    return this.passwordResetToken;
  }

  getPasswordResetExpiry(): Date | null {
    return this.passwordResetExpiry;
  }

  getPasswordChangedAt(): Date | null {
    return this.passwordChangedAt;
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
}
