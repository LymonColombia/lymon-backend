import { GetGuestTagsHandler } from '@/application/guest-tag/queries/get-guest-tags/get-guest-tags.handler';
import { GetGuestTagsQuery } from '@/application/guest-tag/queries/get-guest-tags/get-guest-tags.query';
import { GetGuestTagsResult } from '@/application/guest-tag/queries/get-guest-tags/get-guest-tags.result';
import { GuestTagRepository } from '@/domain/guest-tag/repositories/guest-tag.repository';
import { createGuestTagRepositoryMock } from '@test/shared/mocks/repositories/guest-tag-repository.mock';
import { makeGuestTag } from '@test/shared/fixtures/guest-tag.fixture';

const TENANT_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000';

describe('GetGuestTagsHandler', () => {
  let handler: GetGuestTagsHandler;
  let tagRepository: jest.Mocked<GuestTagRepository>;

  beforeEach(() => {
    tagRepository = createGuestTagRepositoryMock();
    handler = new GetGuestTagsHandler(tagRepository);
  });

  describe('when platform tags exist', () => {
    it('returns all tags as DTOs with id and name', async () => {
      tagRepository.findAll.mockResolvedValue([
        makeGuestTag({ name: 'vip' }),
        makeGuestTag({ name: 'family', id: '65f1a1a2-b3c4-d5e6-f700-000200000000' }),
      ]);

      const result = await handler.execute(new GetGuestTagsQuery(TENANT_ID));

      expect(result).toBeInstanceOf(GetGuestTagsResult);
      expect(result.tags).toHaveLength(2);
      expect(result.tags[0].name).toBe('vip');
      expect(result.tags[1].name).toBe('family');
      expect(result.tags[0].id).toBeDefined();
      expect(tagRepository.findAll).toHaveBeenCalledWith(TENANT_ID);
    });
  });

  describe('when no tags exist', () => {
    it('returns an empty array', async () => {
      tagRepository.findAll.mockResolvedValue([]);

      const result = await handler.execute(new GetGuestTagsQuery(TENANT_ID));

      expect(result.tags).toEqual([]);
    });
  });
});
