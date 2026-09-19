import { GuestAccount } from '@/domain/guest-account/entities/guest-account.entity';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { GuestAccountStatusEnum } from '@/domain/guest-account/value-objects/guest-account-status.vo';
import { Email } from '@/domain/shared/value-objects/email.vo';

export const GUEST_ACCOUNT_FIXTURE_DEFAULTS = {
  id: '65f1a1a2-b3c4-d5e6-f7a8-b9c500000000',
  email: 'guest@example.com',
  passwordHash: 'hashed-password',
  fullName: 'John Doe',
  firstName: 'John',
  lastName: 'Doe',
  phone: null as string | null,
  status: GuestAccountStatusEnum.PENDING_VERIFICATION,
  emailVerified: false,
  emailVerificationToken: null as string | null,
  emailVerificationExpiry: null as Date | null,
  profilePhotoKey: null as string | null,
  pendingEmail: null as string | null,
  emailChangeToken: null as string | null,
  emailChangeExpiry: null as Date | null,
};

export function makeGuestAccount(
  overrides?: Partial<{
    id: string;
    email: string;
    passwordHash: string;
    fullName: string;
    firstName: string | null;
    lastName: string | null;
    phone: string | null;
    status: GuestAccountStatusEnum;
    emailVerified: boolean;
    emailVerificationToken: string | null;
    emailVerificationExpiry: Date | null;
    profilePhotoKey: string | null;
    pendingEmail: string | null;
    emailChangeToken: string | null;
    emailChangeExpiry: Date | null;
  }>,
): GuestAccount {
  const merged = { ...GUEST_ACCOUNT_FIXTURE_DEFAULTS, ...overrides };
  return GuestAccount.reconstitute({
    id: GuestAccountId.createFromString(merged.id),
    email: Email.create(merged.email),
    passwordHash: merged.passwordHash,
    fullName: merged.fullName,
    firstName: merged.firstName,
    lastName: merged.lastName,
    phone: merged.phone,
    status: merged.status,
    emailVerified: merged.emailVerified,
    emailVerificationToken: merged.emailVerificationToken,
    emailVerificationExpiry: merged.emailVerificationExpiry,
    passwordResetToken: null,
    passwordResetExpiry: null,
    passwordChangedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    profilePhotoKey: merged.profilePhotoKey,
    pendingEmail: merged.pendingEmail
      ? Email.create(merged.pendingEmail)
      : null,
    emailChangeToken: merged.emailChangeToken,
    emailChangeExpiry: merged.emailChangeExpiry,
  });
}
