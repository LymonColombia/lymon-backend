import { Email } from '@/domain/shared/value-objects/email.vo';
import { GuestAccountId } from '../value-objects/guest-account-id.vo';
import { GuestAccountStatusEnum } from '../value-objects/guest-account-status.vo';

export interface IGuestAccount {
  emailVerified: boolean;
  id: GuestAccountId;
  email: Email;
  passwordHash: string;
  fullName: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  status: GuestAccountStatusEnum;
  emailVerificationToken: string | null;
  emailVerificationExpiry: Date | null;
  passwordResetToken: string | null;
  passwordResetExpiry: Date | null;
  passwordChangedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  profilePhotoKey: string | null;
  pendingEmail: Email | null;
  emailChangeToken: string | null;
  emailChangeExpiry: Date | null;
}
