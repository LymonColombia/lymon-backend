import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { BadRequestException, Inject, UnauthorizedException } from '@nestjs/common';
import { UpdateGuestProfilePhotoCommand } from '@/application/guest-auth/commands/update-guest-profile-photo/update-guest-profile-photo.command';
import { guestProfilePhotoPrefix } from '@/application/guest-auth/profile-photo/profile-photo-key';
import {
  GUEST_ACCOUNT_REPOSITORY,
  type GuestAccountRepository,
} from '@/domain/guest-account/repositories/guest-account.repository';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import {
  R2StorageService,
  R2_STORAGE_SERVICE,
} from '@/infrastructure/storage/r2-storage.service';

export class UpdateGuestProfilePhotoResult {
  constructor(public readonly profilePhotoUrl: string) {}
}

@CommandHandler(UpdateGuestProfilePhotoCommand)
export class UpdateGuestProfilePhotoHandler
  implements ICommandHandler<UpdateGuestProfilePhotoCommand>
{
  constructor(
    @Inject(GUEST_ACCOUNT_REPOSITORY)
    private readonly guestAccountRepository: GuestAccountRepository,
    @Inject(R2_STORAGE_SERVICE)
    private readonly storageService: R2StorageService,
  ) {}

  async execute(
    command: UpdateGuestProfilePhotoCommand,
  ): Promise<UpdateGuestProfilePhotoResult> {
    // The key comes from the client; it must live under this guest's own prefix
    // so a guest can't claim someone else's (or an arbitrary) object.
    if (!command.key.startsWith(guestProfilePhotoPrefix(command.guestAccountId))) {
      throw new BadRequestException('Invalid profile photo key');
    }

    const account = await this.guestAccountRepository.findById(
      GuestAccountId.createFromString(command.guestAccountId),
    );

    if (!account) {
      throw new UnauthorizedException('Account not found');
    }

    const oldKey = account.getProfilePhotoKey();

    account.setProfilePhotoKey(command.key);
    await this.guestAccountRepository.save(account);

    // URL is never persisted; it's rebuilt from R2_PUBLIC_URL on every read.
    const profilePhotoUrl = this.storageService.getPublicUrl(command.key);

    // Best-effort: remove the old photo once the new one is committed.
    if (oldKey && oldKey !== command.key) {
      await this.storageService.deleteObjects([oldKey]);
    }

    return new UpdateGuestProfilePhotoResult(profilePhotoUrl);
  }
}
