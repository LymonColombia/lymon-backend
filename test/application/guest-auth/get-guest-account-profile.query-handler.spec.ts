import { GetGuestAccountProfileQueryHandler } from '@/application/guest-auth/queries/get-guest-account-profile/get-guest-account-profile.query-handler';
import { GetGuestAccountProfileQuery } from '@/application/guest-auth/queries/get-guest-account-profile/get-guest-account-profile.query';
import { GuestAccountRepository } from '@/domain/guest-account/repositories/guest-account.repository';
import { R2StorageService } from '@/infrastructure/storage/r2-storage.service';
import { UnauthorizedException } from '@nestjs/common';
import { createGuestAccountRepositoryMock } from '@test/shared/mocks/repositories/guest-account-repository.mock';
import {
  makeGuestAccount,
  GUEST_ACCOUNT_FIXTURE_DEFAULTS,
} from '@test/shared/fixtures/guest-account.fixture';

const PUBLIC_BASE = 'https://cdn.example.com';
const ACCOUNT_ID = GUEST_ACCOUNT_FIXTURE_DEFAULTS.id;
const KEY = `guests/${ACCOUNT_ID}/profile/222.png`;

describe('GetGuestAccountProfileQueryHandler', () => {
  let handler: GetGuestAccountProfileQueryHandler;
  let guestAccountRepository: jest.Mocked<GuestAccountRepository>;
  let storageService: jest.Mocked<Pick<R2StorageService, 'getPublicUrl'>>;

  beforeEach(() => {
    guestAccountRepository = createGuestAccountRepositoryMock();
    storageService = {
      getPublicUrl: jest.fn((key: string) => `${PUBLIC_BASE}/${key}`),
    };

    handler = new GetGuestAccountProfileQueryHandler(
      guestAccountRepository,
      storageService as unknown as R2StorageService,
    );
  });

  it('rejects an unknown account', async () => {
    guestAccountRepository.findById.mockResolvedValue(null);

    await expect(
      handler.execute(new GetGuestAccountProfileQuery(ACCOUNT_ID)),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('builds the photo URL from the stored key', async () => {
    guestAccountRepository.findById.mockResolvedValue(
      makeGuestAccount({ profilePhotoKey: KEY }),
    );

    const result = await handler.execute(
      new GetGuestAccountProfileQuery(ACCOUNT_ID),
    );

    expect(result.profilePhotoUrl).toBe(`${PUBLIC_BASE}/${KEY}`);
    expect(result.email).toBe(GUEST_ACCOUNT_FIXTURE_DEFAULTS.email);
  });

  it('returns null photo URL when no key is stored', async () => {
    guestAccountRepository.findById.mockResolvedValue(makeGuestAccount());

    const result = await handler.execute(
      new GetGuestAccountProfileQuery(ACCOUNT_ID),
    );

    expect(result.profilePhotoUrl).toBeNull();
    expect(storageService.getPublicUrl).not.toHaveBeenCalled();
  });
});
