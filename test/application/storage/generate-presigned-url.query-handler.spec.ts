import { GeneratePresignedUrlQueryHandler } from '@/application/storage/queries/generate-presigned-url/generate-presigned-url.query-handler';
import { GeneratePresignedUrlQuery } from '@/application/storage/queries/generate-presigned-url/generate-presigned-url.query';
import { GeneratePresignedUrlResult } from '@/application/storage/queries/generate-presigned-url/generate-presigned-url.result';
import { createR2StorageServiceMock } from '@test/shared/mocks/services/r2-storage.mock';
import { MediaCategory } from '@/application/storage/media-category.enum';

const TENANT_ID = '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000';
const FILE_SIZE = 102400;
const PRESIGNED_URL =
  'https://bucket.account.r2.cloudflarestorage.com/key?X-Amz-Signature=abc';
const PUBLIC_URL = 'https://pub-xxx.r2.dev';

describe('GeneratePresignedUrlQueryHandler', () => {
  let handler: GeneratePresignedUrlQueryHandler;
  let storageService: ReturnType<typeof createR2StorageServiceMock>;

  beforeEach(() => {
    storageService = createR2StorageServiceMock();
    handler = new GeneratePresignedUrlQueryHandler(storageService as any);
  });

  describe('when generating a presigned URL', () => {
    it('returns presignedUrl, fileUrl and key', async () => {
      storageService.generatePresignedPutUrl.mockResolvedValue(PRESIGNED_URL);
      storageService.getPublicUrl.mockReturnValue(
        `${PUBLIC_URL}/${TENANT_ID}/1234-photo.jpg`,
      );

      const result = await handler.execute(
        new GeneratePresignedUrlQuery(
          'photo.jpg',
          'image/jpeg',
          FILE_SIZE,
          TENANT_ID,
          MediaCategory.Experiences,
        ),
      );

      expect(result).toBeInstanceOf(GeneratePresignedUrlResult);
      expect(result.presignedUrl).toBe(PRESIGNED_URL);
      expect(result.fileUrl).toContain(PUBLIC_URL);
      expect(result.key).toContain(TENANT_ID);
      expect(result.key).toContain('photo.jpg');
    });

    it('prefixes the key with tenantId for isolation', async () => {
      storageService.generatePresignedPutUrl.mockResolvedValue(PRESIGNED_URL);
      storageService.getPublicUrl.mockReturnValue(`${PUBLIC_URL}/key`);

      const result = await handler.execute(
        new GeneratePresignedUrlQuery(
          'photo.jpg',
          'image/jpeg',
          FILE_SIZE,
          TENANT_ID,
          MediaCategory.Experiences,
        ),
      );

      expect(result.key.startsWith(TENANT_ID)).toBe(true);
    });

    it('places the key under the category subfolder', async () => {
      storageService.generatePresignedPutUrl.mockResolvedValue(PRESIGNED_URL);
      storageService.getPublicUrl.mockReturnValue(`${PUBLIC_URL}/key`);

      const result = await handler.execute(
        new GeneratePresignedUrlQuery(
          'photo.jpg',
          'image/jpeg',
          FILE_SIZE,
          TENANT_ID,
          MediaCategory.Properties,
        ),
      );

      expect(result.key).toMatch(
        new RegExp(`^${TENANT_ID}/${MediaCategory.Properties}/\\d+-photo\\.jpg$`),
      );
    });

    it('sanitizes special characters in filename', async () => {
      storageService.generatePresignedPutUrl.mockResolvedValue(PRESIGNED_URL);
      storageService.getPublicUrl.mockReturnValue(`${PUBLIC_URL}/key`);

      const result = await handler.execute(
        new GeneratePresignedUrlQuery(
          'my photo (1).jpg',
          'image/jpeg',
          FILE_SIZE,
          TENANT_ID,
          MediaCategory.Units,
        ),
      );

      expect(result.key).not.toContain(' ');
      expect(result.key).not.toContain('(');
      expect(result.key).not.toContain(')');
    });

    it('calls generatePresignedPutUrl with the correct key and contentType', async () => {
      storageService.generatePresignedPutUrl.mockResolvedValue(PRESIGNED_URL);
      storageService.getPublicUrl.mockReturnValue(`${PUBLIC_URL}/key`);

      await handler.execute(
        new GeneratePresignedUrlQuery(
          'photo.jpg',
          'image/png',
          FILE_SIZE,
          TENANT_ID,
          MediaCategory.Experiences,
        ),
      );

      expect(storageService.generatePresignedPutUrl).toHaveBeenCalledWith(
        expect.stringContaining(TENANT_ID),
        'image/png',
        FILE_SIZE,
      );
    });

    it('calls getPublicUrl with the same key used for the presigned URL', async () => {
      storageService.generatePresignedPutUrl.mockResolvedValue(PRESIGNED_URL);
      storageService.getPublicUrl.mockReturnValue(`${PUBLIC_URL}/key`);

      await handler.execute(
        new GeneratePresignedUrlQuery(
          'photo.jpg',
          'image/jpeg',
          FILE_SIZE,
          TENANT_ID,
          MediaCategory.Experiences,
        ),
      );

      const keyUsedForPresigned = (
        storageService.generatePresignedPutUrl.mock.calls[0] as [string, string]
      )[0];
      const keyUsedForPublic = (
        storageService.getPublicUrl.mock.calls[0] as [string]
      )[0];

      expect(keyUsedForPresigned).toBe(keyUsedForPublic);
    });
  });
});
