import { PrismaGuestAccountRepository } from '@/infrastructure/persistence/repositories/prisma-guest-account.repository';
import { GuestAccount } from '@/domain/guest-account/entities/guest-account.entity';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { GuestAccountStatusEnum } from '@/domain/guest-account/value-objects/guest-account-status.vo';
import { Email } from '@/domain/shared/value-objects/email.vo';
import { prisma, resetDatabase } from './prisma.helper';

describe('PrismaGuestAccountRepository', () => {
  const repo = new PrismaGuestAccountRepository(prisma);

  beforeEach(resetDatabase);
  afterAll(async () => {
    await prisma.$disconnect();
  });

  const newAccount = (email = 'ana@example.com') =>
    GuestAccount.create({
      email: Email.create(email),
      passwordHash: 'hash',
      fullName: 'Ana Gomez',
      phone: '+573001112233',
    });

  it('returns the generated id and round-trips the account', async () => {
    const id = await repo.save(newAccount());

    const found = (await repo.findById(GuestAccountId.createFromString(id)))!;
    expect(found.getFullName()).toBe('Ana Gomez');
    expect(found.getEmail().toString()).toBe('ana@example.com');
    expect(found.getStatus()).toBe(GuestAccountStatusEnum.PENDING_VERIFICATION);
    expect(found.isEmailVerified()).toBe(false);
    expect(found.getPendingEmail()).toBeNull();
    expect(found.getFirstName()).toBeNull();
  });

  it('matches the email case-insensitively (citext)', async () => {
    await repo.save(newAccount('Ana@Example.com'));

    expect(await repo.findByEmail(Email.create('ana@example.com'))).not.toBeNull();
  });

  it('updates in place and finds by each token', async () => {
    const id = await repo.save(newAccount());
    const loaded = (await repo.findById(GuestAccountId.createFromString(id)))!;

    const future = new Date(Date.now() + 3_600_000);
    loaded.setEmailVerificationToken('verify-token', future);
    loaded.setResetToken('reset-token', future);
    expect(await repo.save(loaded)).toBe(id);
    expect(await prisma.guest_accounts.count()).toBe(1);

    expect(await repo.findByEmailVerificationToken('verify-token')).not.toBeNull();
    expect(await repo.findByPasswordResetToken('reset-token')).not.toBeNull();
    expect(await repo.findByPasswordResetToken('nope')).toBeNull();
  });

  it('persists a pending email change and finds it by token', async () => {
    const id = await repo.save(newAccount());
    await prisma.guest_accounts.update({
      where: { id },
      data: {
        pending_email: 'new@example.com',
        email_change_token: 'change-token',
        email_change_expiry: new Date(Date.now() + 3_600_000),
      },
    });

    const found = (await repo.findByEmailChangeToken('change-token'))!;
    expect(found.getPendingEmail()!.toString()).toBe('new@example.com');
  });
});
