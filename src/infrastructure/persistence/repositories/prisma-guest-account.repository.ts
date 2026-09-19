import { Injectable } from '@nestjs/common';
import { GuestAccount } from '@/domain/guest-account/entities/guest-account.entity';
import { GuestAccountRepository } from '@/domain/guest-account/repositories/guest-account.repository';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { Email } from '@/domain/shared/value-objects/email.vo';
import { GuestAccountStatusEnum } from '@/domain/guest-account/value-objects/guest-account-status.vo';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import { type guest_accounts as GuestAccountRow } from '@/infrastructure/persistence/prisma/generated/client';

@Injectable()
export class PrismaGuestAccountRepository implements GuestAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(account: GuestAccount): Promise<string> {
    const id = account.getId()?.toString();

    const data = {
      email: account.getEmail().toString(),
      password_hash: account.getPasswordHash(),
      full_name: account.getFullName(),
      first_name: account.getFirstName(),
      last_name: account.getLastName(),
      phone: account.getPhone(),
      status: account.getStatus(),
      email_verified: account.isEmailVerified(),
      email_verification_token: account.getEmailVerificationToken() ?? null,
      email_verification_expiry: account.getEmailVerificationExpiry() ?? null,
      password_reset_token: account.getPasswordResetToken() ?? null,
      password_reset_expiry: account.getPasswordResetExpiry() ?? null,
      password_changed_at: account.getPasswordChangedAt() ?? null,
      profile_photo_key: account.getProfilePhotoKey(),
      pending_email: account.getPendingEmail()?.toString() ?? null,
      email_change_token: account.getEmailChangeToken(),
      email_change_expiry: account.getEmailChangeExpiry(),
      updated_at: account.getUpdatedAt(),
    };

    if (id) {
      await this.prisma.guest_accounts.update({ where: { id }, data });
      return id;
    }

    const created = await this.prisma.guest_accounts.create({
      data: { ...data, created_at: account.getCreatedAt() },
    });
    return created.id;
  }

  async findById(id: GuestAccountId): Promise<GuestAccount | null> {
    return this.findOne({ id: id.toString() });
  }

  async findByEmail(email: Email): Promise<GuestAccount | null> {
    return this.findOne({ email: email.toString() });
  }

  async findByEmailVerificationToken(
    hashedToken: string,
  ): Promise<GuestAccount | null> {
    return this.findOne({ email_verification_token: hashedToken });
  }

  async findByPasswordResetToken(
    hashedToken: string,
  ): Promise<GuestAccount | null> {
    return this.findOne({ password_reset_token: hashedToken });
  }

  async findByEmailChangeToken(
    hashedToken: string,
  ): Promise<GuestAccount | null> {
    return this.findOne({ email_change_token: hashedToken });
  }

  private async findOne(
    where: Record<string, string>,
  ): Promise<GuestAccount | null> {
    const row = await this.prisma.guest_accounts.findFirst({ where });
    return row ? this.toDomain(row) : null;
  }

  private toDomain(row: GuestAccountRow): GuestAccount {
    return GuestAccount.reconstitute({
      id: GuestAccountId.createFromString(row.id),
      email: Email.create(row.email),
      passwordHash: row.password_hash,
      fullName: row.full_name,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      status: row.status as GuestAccountStatusEnum,
      emailVerified: row.email_verified,
      emailVerificationToken: row.email_verification_token,
      emailVerificationExpiry: row.email_verification_expiry,
      passwordResetToken: row.password_reset_token,
      passwordResetExpiry: row.password_reset_expiry,
      passwordChangedAt: row.password_changed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      profilePhotoKey: row.profile_photo_key,
      pendingEmail: row.pending_email ? Email.create(row.pending_email) : null,
      emailChangeToken: row.email_change_token,
      emailChangeExpiry: row.email_change_expiry,
    });
  }
}
