import {
  GuestTagSeedService,
  PLATFORM_GUEST_TAGS,
} from '@/infrastructure/persistence/seeds/guest-tag-seed.service';
import { GuestTagRepository } from '@/domain/guest-tag/repositories/guest-tag.repository';
import { PLATFORM_TENANT_ID } from '@/domain/guest-tag/entities/guest-tag.entity';
import { createGuestTagRepositoryMock } from '@test/shared/mocks/repositories/guest-tag-repository.mock';

describe('GuestTagSeedService', () => {
  let service: GuestTagSeedService;
  let tagRepository: jest.Mocked<GuestTagRepository>;

  beforeEach(() => {
    tagRepository = createGuestTagRepositoryMock();
    service = new GuestTagSeedService(tagRepository);
  });

  describe('when no platform tags exist', () => {
    it('seeds all predefined tags', async () => {
      tagRepository.existsByTenantIdAndName.mockResolvedValue(false);
      tagRepository.save.mockResolvedValue(undefined);

      await service.onApplicationBootstrap();

      expect(tagRepository.save).toHaveBeenCalledTimes(
        PLATFORM_GUEST_TAGS.length,
      );
      for (const name of PLATFORM_GUEST_TAGS) {
        expect(tagRepository.existsByTenantIdAndName).toHaveBeenCalledWith(
          PLATFORM_TENANT_ID,
          name,
        );
      }
    });
  });

  describe('when all platform tags already exist', () => {
    it('skips all saves (idempotent)', async () => {
      tagRepository.existsByTenantIdAndName.mockResolvedValue(true);

      await service.onApplicationBootstrap();

      expect(tagRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('when some tags already exist', () => {
    it('only seeds the missing ones', async () => {
      tagRepository.existsByTenantIdAndName.mockImplementation(
        (_tenantId, name) => Promise.resolve(name === 'vip'),
      );
      tagRepository.save.mockResolvedValue(undefined);

      await service.onApplicationBootstrap();

      expect(tagRepository.save).toHaveBeenCalledTimes(
        PLATFORM_GUEST_TAGS.length - 1,
      );
    });
  });

  describe('when saving a tag throws', () => {
    it('continues seeding remaining tags without crashing', async () => {
      tagRepository.existsByTenantIdAndName.mockResolvedValue(false);
      tagRepository.save
        .mockRejectedValueOnce(new Error('DB error'))
        .mockResolvedValue(undefined);

      await expect(service.onApplicationBootstrap()).resolves.not.toThrow();
      expect(tagRepository.save).toHaveBeenCalledTimes(
        PLATFORM_GUEST_TAGS.length,
      );
    });
  });
});
