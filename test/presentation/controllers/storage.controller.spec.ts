import { StorageController } from '@/presentation/controllers/storage.controller';
import { QueryBus } from '@nestjs/cqrs';
import { GeneratePresignedUrlQuery } from '@/application/storage/queries/generate-presigned-url/generate-presigned-url.query';

const baseUser = {
  userId: '65f1a1a2-b3c4-d5e6-f7a8-b9c100000000',
  email: 'owner@test.com',
  tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
  activePlan: 'TRIAL',
  isOwner: true,
  emailVerified: true,
  roleAssignments: [],
} as any;

const presignedUrlResult = {
  presignedUrl:
    'https://bucket.account.r2.cloudflarestorage.com/key?X-Amz-Signature=abc',
  fileUrl: 'https://pub-xxx.r2.dev/65f1a1a2b3c4d5e6f7a8b9c0/1234-photo.jpg',
  key: '65f1a1a2b3c4d5e6f7a8b9c0/1234-photo.jpg',
};

describe('StorageController', () => {
  let controller: StorageController;
  let queryBus: { execute: jest.Mock };

  beforeEach(() => {
    queryBus = { execute: jest.fn() };
    controller = new StorageController(queryBus as unknown as QueryBus);
  });

  describe('POST /storage/presigned-url', () => {
    it('returns presignedUrl, fileUrl and key', async () => {
      queryBus.execute.mockResolvedValue(presignedUrlResult);

      const result = await controller.generatePresignedUrl(baseUser, {
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      });

      expect(result).toEqual({
        message: 'Presigned URL generated',
        data: {
          presignedUrl: presignedUrlResult.presignedUrl,
          fileUrl: presignedUrlResult.fileUrl,
          key: presignedUrlResult.key,
        },
      });
    });

    it('dispatches GeneratePresignedUrlQuery with correct params', async () => {
      queryBus.execute.mockResolvedValue(presignedUrlResult);

      await controller.generatePresignedUrl(baseUser, {
        fileName: 'photo.jpg',
        contentType: 'image/jpeg',
      });

      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.any(GeneratePresignedUrlQuery),
      );

      const query: GeneratePresignedUrlQuery =
        queryBus.execute.mock.calls[0][0];
      expect(query.fileName).toBe('photo.jpg');
      expect(query.contentType).toBe('image/jpeg');
      expect(query.tenantId).toBe(baseUser.tenantId);
    });
  });
});
