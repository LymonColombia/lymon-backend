import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  Inject,
} from '@nestjs/common';
import {
  GUEST_TAG_REPOSITORY,
  type GuestTagRepository,
} from '@/domain/guest-tag/repositories/guest-tag.repository';
import {
  GuestTag,
  PLATFORM_TENANT_ID,
} from '@/domain/guest-tag/entities/guest-tag.entity';

export const PLATFORM_GUEST_TAGS = [
  'vip',
  'family',
  'honeymoon',
  'business',
  'regular',
  'pet friendly',
  'accessibility needs',
  'loyalty member',
  'early check-in',
  'late checkout',
];

@Injectable()
export class GuestTagSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(GuestTagSeedService.name);

  constructor(
    @Inject(GUEST_TAG_REPOSITORY)
    private readonly guestTagRepository: GuestTagRepository,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    for (const name of PLATFORM_GUEST_TAGS) {
      await this.seedPlatformTag(name);
    }
  }

  private async seedPlatformTag(name: string): Promise<void> {
    try {
      const exists = await this.guestTagRepository.existsByTenantIdAndName(
        PLATFORM_TENANT_ID,
        name,
      );

      if (exists) {
        this.logger.debug(`Platform tag "${name}" already exists — skipping`);
        return;
      }

      await this.guestTagRepository.save(GuestTag.createPlatform(name));
      this.logger.log(`Platform tag "${name}" seeded successfully`);
    } catch (error) {
      this.logger.error(`Failed to seed platform tag "${name}"`, error);
    }
  }
}
