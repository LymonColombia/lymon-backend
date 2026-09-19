import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { GeneratePresignedUrlDto } from '@/presentation/dtos/generate-presigned-url.dto';
import { MediaCategory } from '@/application/storage/media-category.enum';
import { MAX_IMAGE_SIZE_BYTES } from '@/application/storage/image-upload.constants';

const base = {
  fileName: 'photo.jpg',
  contentType: 'image/jpeg',
  fileSize: 102400,
  category: MediaCategory.Experiences,
};

const errorsFor = (overrides: Partial<typeof base>) =>
  validateSync(plainToInstance(GeneratePresignedUrlDto, { ...base, ...overrides }));

describe('GeneratePresignedUrlDto', () => {
  it('accepts a valid image upload', () => {
    expect(errorsFor({})).toHaveLength(0);
  });

  it('coerces a numeric-string fileSize', () => {
    expect(errorsFor({ fileSize: '102400' as unknown as number })).toHaveLength(
      0,
    );
  });

  it('rejects a file over the size limit', () => {
    const errors = errorsFor({ fileSize: MAX_IMAGE_SIZE_BYTES + 1 });
    expect(errors.some((e) => e.property === 'fileSize')).toBe(true);
  });

  it('rejects a non-image content type', () => {
    const errors = errorsFor({ contentType: 'application/pdf' });
    expect(errors.some((e) => e.property === 'contentType')).toBe(true);
  });
});
