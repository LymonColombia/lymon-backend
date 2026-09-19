import { GuestAccount } from '@/domain/guest-account/entities/guest-account.entity';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { GuestAccountStatusEnum } from '@/domain/guest-account/value-objects/guest-account-status.vo';
import { Email } from '@/domain/shared/value-objects/email.vo';

describe('GuestAccount entity', () => {
  it('creates account with normalized full name', () => {
    const account = GuestAccount.create({
      fullName: '  John Doe  ',
      email: Email.create('john@example.com'),
      passwordHash: 'hash',
      firstName: ' John ',
      lastName: ' Doe ',
    });

    expect(account.getId()).toBeNull();
    expect(account.getFullName()).toBe('John Doe');
    expect(account.getStatus()).toBe(
      GuestAccountStatusEnum.PENDING_VERIFICATION,
    );
    expect(account.isEmailVerified()).toBe(false);
  });

  it('throws when fullName is empty in create', () => {
    expect(() =>
      GuestAccount.create({
        fullName: '  ',
        email: Email.create('john@example.com'),
        passwordHash: 'hash',
      }),
    ).toThrow('GuestAccount fullName is required');
  });

  it('verifyEmail activates account and clears verification token data', () => {
    const account = GuestAccount.reconstitute({
      id: GuestAccountId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c200000000'),
      email: Email.create('john@example.com'),
      passwordHash: 'hash',
      fullName: 'John Doe',
      firstName: 'John',
      lastName: 'Doe',
      phone: null,
      status: GuestAccountStatusEnum.PENDING_VERIFICATION,
      emailVerified: false,
      emailVerificationToken: 'token',
      emailVerificationExpiry: new Date(Date.now() + 60_000),
      passwordResetToken: null,
      passwordResetExpiry: null,
      passwordChangedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      profilePhotoKey: null,
      pendingEmail: null,
      emailChangeToken: null,
      emailChangeExpiry: null,
    });

    account.verifyEmail();

    expect(account.isEmailVerified()).toBe(true);
    expect(account.getStatus()).toBe(GuestAccountStatusEnum.ACTIVE);
    expect(account.getEmailVerificationToken()).toBeNull();
    expect(account.getEmailVerificationExpiry()).toBeNull();
  });

  it('handles reset token lifecycle', () => {
    const account = GuestAccount.create({
      fullName: 'John Doe',
      email: Email.create('john@example.com'),
      passwordHash: 'hash',
    });

    const expiry = new Date(Date.now() + 60_000);
    account.setResetToken('hashed-token', expiry);
    expect(account.getPasswordResetToken()).toBe('hashed-token');
    expect(account.isResetTokenValid(new Date())).toBe(true);

    account.clearResetToken();
    expect(account.getPasswordResetToken()).toBeNull();
    expect(account.isResetTokenValid(new Date())).toBe(false);
  });

  it('updateProfile validates required fullName', () => {
    const account = GuestAccount.create({
      fullName: 'John Doe',
      email: Email.create('john@example.com'),
      passwordHash: 'hash',
    });

    expect(() => account.updateProfile('   ')).toThrow(
      'GuestAccount fullName is required',
    );
  });
});
