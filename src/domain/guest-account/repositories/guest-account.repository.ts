import { GuestAccount } from '@/domain/guest-account/entities/guest-account.entity';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { Email } from '@/domain/shared/value-objects/email.vo';

export const GUEST_ACCOUNT_REPOSITORY = Symbol('GUEST_ACCOUNT_REPOSITORY');

export interface GuestAccountRepository {
  save(account: GuestAccount): Promise<string>;
  findById(id: GuestAccountId): Promise<GuestAccount | null>;
  findByEmail(email: Email): Promise<GuestAccount | null>;
  findByEmailVerificationToken(
    hashedToken: string,
  ): Promise<GuestAccount | null>;
  findByPasswordResetToken(hashedToken: string): Promise<GuestAccount | null>;
  findByEmailChangeToken(hashedToken: string): Promise<GuestAccount | null>;
}
