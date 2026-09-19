import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  R2StorageService,
  R2_STORAGE_SERVICE,
} from '@/infrastructure/storage/r2-storage.service';
import { GeneratePresignedUrlQuery } from './generate-presigned-url.query';
import { GeneratePresignedUrlResult } from './generate-presigned-url.result';

@QueryHandler(GeneratePresignedUrlQuery)
export class GeneratePresignedUrlQueryHandler implements IQueryHandler<
  GeneratePresignedUrlQuery,
  GeneratePresignedUrlResult
> {
  constructor(
    @Inject(R2_STORAGE_SERVICE)
    private readonly storageService: R2StorageService,
  ) {}

  async execute(
    query: GeneratePresignedUrlQuery,
  ): Promise<GeneratePresignedUrlResult> {
    const sanitizedName = query.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `${query.tenantId}/${query.category}/${Date.now()}-${sanitizedName}`;

    const presignedUrl = await this.storageService.generatePresignedPutUrl(
      key,
      query.contentType,
      query.fileSize,
    );
    const fileUrl = this.storageService.getPublicUrl(key);

    return new GeneratePresignedUrlResult(presignedUrl, fileUrl, key);
  }
}
