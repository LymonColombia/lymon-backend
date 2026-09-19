import { Inject, UnauthorizedException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  GUEST_ACCOUNT_REPOSITORY,
  type GuestAccountRepository,
} from '@/domain/guest-account/repositories/guest-account.repository';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import {
  R2StorageService,
  R2_STORAGE_SERVICE,
} from '@/infrastructure/storage/r2-storage.service';
import { GetGuestAccountProfileQuery } from './get-guest-account-profile.query';
import { GetGuestAccountProfileResult } from './get-guest-account-profile.result';

@QueryHandler(GetGuestAccountProfileQuery)
export class GetGuestAccountProfileQueryHandler
  implements
    IQueryHandler<GetGuestAccountProfileQuery, GetGuestAccountProfileResult>
{
  constructor(
    @Inject(GUEST_ACCOUNT_REPOSITORY)
    private readonly guestAccountRepository: GuestAccountRepository,
    @Inject(R2_STORAGE_SERVICE)
    private readonly storageService: R2StorageService,
  ) {}

  async execute(
    query: GetGuestAccountProfileQuery,
  ): Promise<GetGuestAccountProfileResult> {
    const account = await this.guestAccountRepository.findById(
      GuestAccountId.createFromString(query.guestAccountId),
    );

    if (!account) {
      throw new UnauthorizedException('Account not found');
    }

    // Only the key is persisted; the URL is rebuilt from R2_PUBLIC_URL here.
    const key = account.getProfilePhotoKey();
    const profilePhotoUrl = key ? this.storageService.getPublicUrl(key) : null;

    return new GetGuestAccountProfileResult(
      account.getId()!.toString(),
      account.getEmail().toString(),
      account.getFullName(),
      account.getFirstName(),
      account.getLastName(),
      account.isEmailVerified(),
      profilePhotoUrl,
    );
  }
}
