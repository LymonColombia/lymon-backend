import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GUEST_ACCOUNT_REPOSITORY,
  type GuestAccountRepository,
} from '@/domain/guest-account/repositories/guest-account.repository';
import { GuestAccount } from '@/domain/guest-account/entities/guest-account.entity';
import { Email } from '@/domain/shared/value-objects/email.vo';
import { BcryptPasswordHasher } from '@/application/auth/services/password-hasher.service';

export const DEV_GUEST_EMAIL = 'dev.guest@lymon.local';
export const DEV_GUEST_PASSWORD = 'DevPassword123!';

/**
 * Seeds a demo guest account for local dev, already email-verified so
 * devs can log in without going through the verification flow. Dev
 * only — gated by isDevelopment. Safe to run on every boot — only
 * inserts when missing.
 */
@Injectable()
export class GuestAccountSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(GuestAccountSeedService.name);
  private readonly passwordHasher = new BcryptPasswordHasher();

  constructor(
    @Inject(GUEST_ACCOUNT_REPOSITORY)
    private readonly guestAccountRepository: GuestAccountRepository,
    private readonly configService: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.configService.get<string>('isDevelopment') !== 'true') {
      return;
    }

    try {
      const email = Email.create(DEV_GUEST_EMAIL);

      const existing = await this.guestAccountRepository.findByEmail(email);
      if (existing) {
        this.logger.debug('Dev guest account already exists — skipping');
        return;
      }

      const passwordHash = await this.passwordHasher.hash(DEV_GUEST_PASSWORD);
      const account = GuestAccount.create({
        fullName: 'Dev Guest',
        firstName: 'Dev',
        lastName: 'Guest',
        email,
        passwordHash,
      });
      account.verifyEmail();

      await this.guestAccountRepository.save(account);

      this.logger.log(
        `Dev guest account seeded — login with ${DEV_GUEST_EMAIL} / ${DEV_GUEST_PASSWORD}`,
      );
    } catch (error) {
      this.logger.error('Failed to seed dev guest account', error);
    }
  }
}
