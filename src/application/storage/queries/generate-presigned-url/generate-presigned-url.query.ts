import { MediaCategory } from '@/application/storage/media-category.enum';

export class GeneratePresignedUrlQuery {
  constructor(
    public readonly fileName: string,
    public readonly contentType: string,
    public readonly fileSize: number,
    public readonly tenantId: string,
    public readonly category: MediaCategory,
  ) {}
}
