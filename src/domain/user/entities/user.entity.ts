import { Email } from '@/domain/shared/value-objects/email.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

export type UserScope =
  | { type: 'TENANT' }
  | { type: 'PROPERTY'; resourceIds: string[] }
  | { type: 'UNIT'; resourceIds: string[] };

/**
 * A single role+resource assignment.
 * One user can have multiple of these — e.g. ADMIN on Property X, VIEWER on Property Y.
 */
export interface RoleAssignment {
  roleId: string;
  scope: UserScope;
}

export interface UserReconstitutionData {
  id: UserId;
  email: Email;
  passwordHash: string;
  tenantId: TenantId;
  isOwnerFlag: boolean;
  roleAssignments: RoleAssignment[];
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  passwordChangedAt?: Date;
  deletedAt?: Date | null;
  readonly fullName?: string;
  readonly document?: string;
  readonly tutorialCompleted?: boolean;
}

/** Kept for OWNER identity checks only. Staff roles are managed via RoleAssignment. */
export enum UserRoleEnum {
  OWNER = 'OWNER',
  STAFF = 'STAFF',
}

export class UserId {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static createFromString(value: string): UserId {
    if (!value || value.trim() === '') {
      throw new Error('UserId cannot be empty');
    }
    return new UserId(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: UserId): boolean {
    return this.value === other.value;
  }
}

export class User {
  private constructor(
    private readonly id: UserId | null,
    private readonly email: Email,
    private passwordHash: string,
    private readonly tenantId: TenantId,
    private readonly isOwnerFlag: boolean,
    private roleAssignments: RoleAssignment[],
    private emailVerified: boolean,
    private readonly createdAt: Date,
    private updatedAt: Date,
    private resetPasswordToken?: string,
    private resetPasswordExpires?: Date,
    private passwordChangedAt?: Date,
    private deletedAt: Date | null = null,
    private fullName?: string,
    private document?: string,
    private tutorialCompleted: boolean = false,
  ) {}

  static createOwner(
    email: Email,
    passwordHash: string,
    tenantId: TenantId,
  ): User {
    return new User(
      null,
      email,
      passwordHash,
      tenantId,
      true,
      [],
      false,
      new Date(),
      new Date(),
    );
  }

  static createStaff(
    email: Email,
    passwordHash: string,
    tenantId: TenantId,
    roleAssignments: RoleAssignment[],
    fullName?: string,
    document?: string,
  ): User {
    return new User(
      null,
      email,
      passwordHash,
      tenantId,
      false,
      roleAssignments,
      false,
      new Date(),
      new Date(),
      undefined,
      undefined,
      undefined,
      null,
      fullName,
      document,
    );
  }

  /**
   * Reconstitutes a User entity from persisted data.
   * Reduces parameter count by using a data transfer object, improving code maintainability.
   */
  static reconstitute(data: UserReconstitutionData): User {
    return new User(
      data.id,
      data.email,
      data.passwordHash,
      data.tenantId,
      data.isOwnerFlag,
      data.roleAssignments,
      data.emailVerified,
      data.createdAt,
      data.updatedAt,
      data.resetPasswordToken,
      data.resetPasswordExpires,
      data.passwordChangedAt,
      data.deletedAt,
      data.fullName,
      data.document,
      data.tutorialCompleted ?? false,
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

  updateRoleAssignments(roleAssignments: RoleAssignment[]): void {
    this.roleAssignments = roleAssignments;
    this.updatedAt = new Date();
  }

  isEmailVerified(): boolean {
    return this.emailVerified;
  }

  getId(): UserId | null {
    return this.id;
  }

  getEmail(): Email {
    return this.email;
  }

  getFullName(): string | undefined {
    return this.fullName;
  }

  getDocument(): string | undefined {
    return this.document;
  }

  updateFullName(fullName?: string): void {
    this.fullName = fullName;
    this.updatedAt = new Date();
  }

  updateDocument(document?: string): void {
    this.document = document;
    this.updatedAt = new Date();
  }

  getTutorialCompleted(): boolean {
    return this.tutorialCompleted;
  }

  completeTutorial(): void {
    this.tutorialCompleted = true;
    this.updatedAt = new Date();
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getPasswordHash(): string {
    return this.passwordHash;
  }

  changePassword(newPasswordHash: string): void {
    if (!newPasswordHash || newPasswordHash.trim() === '') {
      throw new Error('Password hash cannot be empty');
    }

    this.passwordHash = newPasswordHash;
    this.passwordChangedAt = new Date();
    this.updatedAt = new Date();
  }

  setResetToken(hashedToken: string, expiresAt: Date): void {
    if (!hashedToken || hashedToken.trim() === '') {
      throw new Error('Reset token cannot be empty');
    }

    const now = new Date();
    if (expiresAt <= now) {
      throw new Error('Reset token expiration must be in the future');
    }

    this.resetPasswordToken = hashedToken;
    this.resetPasswordExpires = expiresAt;
    this.updatedAt = new Date();
  }

  getResetPasswordToken(): string | undefined {
    return this.resetPasswordToken;
  }

  getResetPasswordExpires(): Date | undefined {
    return this.resetPasswordExpires;
  }

  resetPasswordWithToken(newPasswordHash: string, currentDate: Date): void {
    if (!this.isResetTokenValid(currentDate)) {
      throw new Error('Reset token is invalid or expired');
    }

    this.changePassword(newPasswordHash);
    this.clearResetToken();
  }

  clearResetToken(): void {
    this.resetPasswordToken = undefined;
    this.resetPasswordExpires = undefined;
    this.updatedAt = new Date();
  }

  isResetTokenValid(currentDate: Date): boolean {
    if (!this.resetPasswordToken || !this.resetPasswordExpires) {
      return false;
    }
    return currentDate <= this.resetPasswordExpires;
  }

  getPasswordChangedAt(): Date | undefined {
    return this.passwordChangedAt;
  }

  getTenantId(): TenantId {
    return this.tenantId;
  }

  /** @deprecated Use isOwner() for identity checks; use roleAssignments for permission checks */
  getRole(): UserRoleEnum {
    return this.isOwnerFlag ? UserRoleEnum.OWNER : UserRoleEnum.STAFF;
  }

  getRoleAssignments(): RoleAssignment[] {
    return [...this.roleAssignments];
  }

  isOwner(): boolean {
    return this.isOwnerFlag;
  }
}
