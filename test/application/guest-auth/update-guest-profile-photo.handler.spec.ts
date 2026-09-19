import {
  UpdateGuestProfilePhotoHandler,
  UpdateGuestProfilePhotoResult,
} from '@/application/guest-auth/commands/update-guest-profile-photo/update-guest-profile-photo.handler';
import { UpdateGuestProfilePhotoCommand } from '@/application/guest-auth/commands/update-guest-profile-photo/update-guest-profile-photo.command';
import { GuestAccountRepository } from '@/domain/guest-account/repositories/guest-account.repository';
import { R2StorageService } from '@/infrastructure/storage/r2-storage.service';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { createGuestAccountRepositoryMock } from '@test/shared/mocks/repositories/guest-account-repository.mock';
import {
  makeGuestAccount,
  GUEST_ACCOUNT_FIXTURE_DEFAULTS,
} from '@test/shared/fixtures/guest-account.fixture';

const PUBLIC_BASE = 'https://cdn.example.com';
const ACCOUNT_ID = GUEST_ACCOUNT_FIXTURE_DEFAULTS.id;
const KEY = `guests/${ACCOUNT_ID}/profile/222.png`;

describe('UpdateGuestProfilePhotoHandler', () => {
  let handler: UpdateGuestProfilePhotoHandler;
  let guestAccountRepository: jest.Mocked<GuestAccountRepository>;
  let storageService: jest.Mocked<
    Pick<R2StorageService, 'deleteObjects' | 'getPublicUrl' | 'keyFromPublicUrl'>
  >;

  beforeEach(() => {
    guestAccountRepository = createGuestAccountRepositoryMock();
    storageService = {
      deleteObjects: jest.fn(),
      getPublicUrl: jest.fn((key: string) => `${PUBLIC_BASE}/${key}`),
      keyFromPublicUrl: jest.fn((url: string) =>
        url.startsWith(`${PUBLIC_BASE}/`)
          ? url.slice(PUBLIC_BASE.length + 1)
          : null,
      ),
    };

    handler = new UpdateGuestProfilePhotoHandler(
      guestAccountRepository,
      storageService as unknown as R2StorageService,
    );
  });

  it('rejects a key outside the guest own prefix', async () => {
    await expect(
      handler.execute(
        new UpdateGuestProfilePhotoCommand(
          ACCOUNT_ID,
          'guests/someone-else/profile/1.png',
        ),
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(guestAccountRepository.findById).not.toHaveBeenCalled();
  });

  it('rejects an unknown account', async () => {
    guestAccountRepository.findById.mockResolvedValue(null);

    await expect(
      handler.execute(new UpdateGuestProfilePhotoCommand(ACCOUNT_ID, KEY)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('persists the key and returns the URL built from it', async () => {
    guestAccountRepository.findById.mockResolvedValue(makeGuestAccount());

    const result = await handler.execute(
      new UpdateGuestProfilePhotoCommand(ACCOUNT_ID, KEY),
    );

    expect(result).toBeInstanceOf(UpdateGuestProfilePhotoResult);
    const saved = guestAccountRepository.save.mock.calls[0][0];
    expect(saved.getProfilePhotoKey()).toBe(KEY);
    expect(result.profilePhotoUrl).toBe(`${PUBLIC_BASE}/${KEY}`);
  });

  it('deletes the previous photo after committing the new one', async () => {
    const oldKey = `guests/${ACCOUNT_ID}/profile/111.jpg`;
    guestAccountRepository.findById.mockResolvedValue(
      makeGuestAccount({ profilePhotoKey: oldKey }),
    );

    await handler.execute(new UpdateGuestProfilePhotoCommand(ACCOUNT_ID, KEY));

    expect(storageService.deleteObjects).toHaveBeenCalledWith([oldKey]);
  });

  it('does not delete anything on the first upload', async () => {
    guestAccountRepository.findById.mockResolvedValue(makeGuestAccount());

    await handler.execute(new UpdateGuestProfilePhotoCommand(ACCOUNT_ID, KEY));

    expect(storageService.deleteObjects).not.toHaveBeenCalled();
  });
});
