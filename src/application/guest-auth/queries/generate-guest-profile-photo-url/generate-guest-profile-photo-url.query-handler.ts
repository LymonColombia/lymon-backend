import { Inject, BadRequestException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  R2StorageService,
  R2_STORAGE_SERVICE,
} from '@/infrastructure/storage/r2-storage.service';
import {
  PROFILE_PHOTO_EXT_BY_CONTENT_TYPE,
  guestProfilePhotoPrefix,
} from '@/application/guest-auth/profile-photo/profile-photo-key';
import { GenerateGuestProfilePhotoUrlQuery } from './generate-guest-profile-photo-url.query';
import { GenerateGuestProfilePhotoUrlResult } from './generate-guest-profile-photo-url.result';

@QueryHandler(GenerateGuestProfilePhotoUrlQuery)
export class GenerateGuestProfilePhotoUrlQueryHandler
  implements
    IQueryHandler<
      GenerateGuestProfilePhotoUrlQuery,
      GenerateGuestProfilePhotoUrlResult
    >
{
  constructor(
    @Inject(R2_STORAGE_SERVICE)
    private readonly storageService: R2StorageService,
  ) {}

  async execute(
    query: GenerateGuestProfilePhotoUrlQuery,
  ): Promise<GenerateGuestProfilePhotoUrlResult> {
    const ext = PROFILE_PHOTO_EXT_BY_CONTENT_TYPE[query.contentType];
    if (!ext) {
      throw new BadRequestException('Unsupported image type');
    }

    const key = `${guestProfilePhotoPrefix(query.guestAccountId)}${Date.now()}.${ext}`;

    const presignedUrl = await this.storageService.generatePresignedPutUrl(
      key,
      query.contentType,
      query.fileSize,
    );
    const fileUrl = this.storageService.getPublicUrl(key);

    return new GenerateGuestProfilePhotoUrlResult(presignedUrl, fileUrl, key);
  }
}
