import { GetAvailableExperiencesQueryHandler } from '@/application/experience/queries/GetAvailableExperiences/get-available-experiences.query-handler';
import { GetAvailableExperiencesQuery } from '@/application/experience/queries/GetAvailableExperiences/get-available-experiences.query';
import { GetAvailableExperiencesResult } from '@/application/experience/queries/GetAvailableExperiences/get-available-experiences.result';
import { ExperienceRepository } from '@/domain/experience/repositories/experience.repository';
import { BadRequestException } from '@nestjs/common';
import { createExperienceRepositoryMock } from '@test/shared/mocks/repositories/experience-repository.mock';
import {
  makeExperience,
  EXPERIENCE_FIXTURE_DEFAULTS,
} from '@test/shared/fixtures/experience.fixture';

describe('GetAvailableExperiencesQueryHandler', () => {
  let handler: GetAvailableExperiencesQueryHandler;
  let experienceRepository: jest.Mocked<ExperienceRepository>;

  beforeEach(() => {
    experienceRepository = createExperienceRepositoryMock();
    handler = new GetAvailableExperiencesQueryHandler(
      experienceRepository,
      {
        getPublicUrl: (k: string) => k,
      } as any,
    );
  });

  describe('with no filters', () => {
    it('returns paginated result with all active experiences', async () => {
      const experience = makeExperience();
      experienceRepository.findAvailableForGuestPaginated.mockResolvedValue({
        experiences: [experience],
        total: 1,
      });

      const result = await handler.execute(
        new GetAvailableExperiencesQuery(1, 10),
      );

      expect(result).toBeInstanceOf(GetAvailableExperiencesResult);
      expect(result.experiences).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(
        experienceRepository.findAvailableForGuestPaginated,
      ).toHaveBeenCalledWith(
        {
          tenantId: undefined,
          propertyId: undefined,
          category: undefined,
          sortByPrice: undefined,
        },
        1,
        10,
      );
    });
  });

  describe('with tenantId filter', () => {
    it('passes tenantId value object to repository', async () => {
      experienceRepository.findAvailableForGuestPaginated.mockResolvedValue({
        experiences: [],
        total: 0,
      });

      await handler.execute(
        new GetAvailableExperiencesQuery(
          1,
          10,
          EXPERIENCE_FIXTURE_DEFAULTS.tenantId,
        ),
      );

      const call =
        experienceRepository.findAvailableForGuestPaginated.mock.calls[0];
      expect(call[0].tenantId?.toString()).toBe(
        EXPERIENCE_FIXTURE_DEFAULTS.tenantId,
      );
    });
  });

  describe('with tenantId + propertyId filters', () => {
    it('passes both value objects to repository', async () => {
      const propertyId = '65f1a1a2-b3c4-d5e6-f7a8-b90200000000';
      experienceRepository.findAvailableForGuestPaginated.mockResolvedValue({
        experiences: [],
        total: 0,
      });

      await handler.execute(
        new GetAvailableExperiencesQuery(
          1,
          10,
          EXPERIENCE_FIXTURE_DEFAULTS.tenantId,
          propertyId,
        ),
      );

      const call =
        experienceRepository.findAvailableForGuestPaginated.mock.calls[0];
      expect(call[0].tenantId?.toString()).toBe(
        EXPERIENCE_FIXTURE_DEFAULTS.tenantId,
      );
      expect(call[0].propertyId?.toString()).toBe(propertyId);
    });
  });

  describe('with propertyId filter only', () => {
    it('passes only the propertyId filter to repository', async () => {
      const propertyId = '65f1a1a2-b3c4-d5e6-f7a8-b90200000000';
      experienceRepository.findAvailableForGuestPaginated.mockResolvedValue({
        experiences: [],
        total: 0,
      });

      await handler.execute(
        new GetAvailableExperiencesQuery(1, 10, undefined, propertyId),
      );

      const call =
        experienceRepository.findAvailableForGuestPaginated.mock.calls[0];
      expect(call[0].propertyId?.toString()).toBe(propertyId);
      expect(call[0].tenantId).toBeUndefined();
    });

    it('throws BadRequestException when propertyId is invalid instead of dropping the filter', async () => {
      await expect(
        handler.execute(
          new GetAvailableExperiencesQuery(1, 10, undefined, 'not-a-property'),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(
        experienceRepository.findAvailableForGuestPaginated,
      ).not.toHaveBeenCalled();
    });
  });

  describe('with category filter', () => {
    it('passes category value object to repository', async () => {
      experienceRepository.findAvailableForGuestPaginated.mockResolvedValue({
        experiences: [],
        total: 0,
      });

      await handler.execute(
        new GetAvailableExperiencesQuery(
          1,
          10,
          undefined,
          undefined,
          'TRANSPORTATION',
        ),
      );

      const call =
        experienceRepository.findAvailableForGuestPaginated.mock.calls[0];
      expect(call[0].category?.toString()).toBe('TRANSPORTATION');
    });
  });

  describe('with invalid tenantId', () => {
    it('calls repository with undefined tenantId and does not throw', async () => {
      experienceRepository.findAvailableForGuestPaginated.mockResolvedValue({
        experiences: [],
        total: 0,
      });

      await expect(
        handler.execute(new GetAvailableExperiencesQuery(1, 10, '')),
      ).resolves.toBeInstanceOf(GetAvailableExperiencesResult);

      const call =
        experienceRepository.findAvailableForGuestPaginated.mock.calls[0];
      expect(call[0].tenantId).toBeUndefined();
    });
  });

  describe('when no experiences exist', () => {
    it('returns empty result with total 0', async () => {
      experienceRepository.findAvailableForGuestPaginated.mockResolvedValue({
        experiences: [],
        total: 0,
      });

      const result = await handler.execute(
        new GetAvailableExperiencesQuery(1, 10),
      );

      expect(result.experiences).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('pagination', () => {
    it('calculates totalPages correctly for multiple pages', async () => {
      experienceRepository.findAvailableForGuestPaginated.mockResolvedValue({
        experiences: Array.from({ length: 5 }, (_, i) =>
          makeExperience({ id: `65f1a1a2b3c4d5e6f7a8b90${i}` }),
        ),
        total: 23,
      });

      const result = await handler.execute(
        new GetAvailableExperiencesQuery(2, 5),
      );

      expect(result.total).toBe(23);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.totalPages).toBe(5);
    });
  });
});
