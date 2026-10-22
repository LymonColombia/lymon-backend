import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { NotFoundException } from '@nestjs/common';
import { GuestController } from '@/presentation/controllers/guest.controller';
import { CreateGuestCommand } from '@/application/guest/commands/create-guest.command';
import { GetGuestByIdQuery } from '@/application/guest/queries/get-guest-by-id/get-guest-by-id.query';
import { UpdateGuestProfileCommand } from '@/application/guest/commands/update-guest-profile/update-guest-profile.command';
import { ChangeGuestPasswordCommand } from '@/application/guest-auth/commands/change-guest-password/change-guest-password.command';
import { GetGuestAccountProfileQuery } from '@/application/guest-auth/queries/get-guest-account-profile/get-guest-account-profile.query';
import { GenerateGuestProfilePhotoUrlQuery } from '@/application/guest-auth/queries/generate-guest-profile-photo-url/generate-guest-profile-photo-url.query';
import { UpdateGuestProfilePhotoCommand } from '@/application/guest-auth/commands/update-guest-profile-photo/update-guest-profile-photo.command';
import { UpdateGuestAccountProfileCommand } from '@/application/guest-auth/commands/update-guest-account-profile/update-guest-account-profile.command';
import { Guest } from '@/domain/guest/entities/guest.entity';
import { GuestTag } from '@/domain/guest-tag/entities/guest-tag.entity';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import type { JwtPayload } from '@/application/auth/services/jwt.service';
import type { GuestJwtPayload } from '@/application/guest-auth/services/guest-jwt.service';

describe('GuestController', () => {
  let controller: GuestController;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };
  let searchGuestsQuery: { execute: jest.Mock };
  let findGuestByDocumentNumberQuery: { execute: jest.Mock };

  const user = { tenantId: 'hotel-123' } as JwtPayload;
  const guestJwtPayload = {
    guestAccountId: 'guest-account-1',
  } as GuestJwtPayload;

  const guest = Guest.create({
    tenantId: TenantId.createFromString('hotel-123'),
    identity: { documentType: 'CC', documentNumber: '12345' },
    fullName: 'Juan Perez',
    firstName: 'Juan',
    lastName: 'Perez',
    primaryEmail: 'juan@example.com',
    phone: '+573000000000',
  });
  guest.setTags([GuestTag.createPlatform('VIP')]);

  beforeEach(() => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };
    searchGuestsQuery = { execute: jest.fn() };
    findGuestByDocumentNumberQuery = { execute: jest.fn() };

    controller = new GuestController(
      commandBus as unknown as CommandBus,
      queryBus as unknown as QueryBus,
      searchGuestsQuery as any,
      findGuestByDocumentNumberQuery as any,
    );
  });

  describe('create', () => {
    it('dispatches CreateGuestCommand without preferences when none are given', async () => {
      commandBus.execute.mockResolvedValue({ guestId: 'guest-2' });

      const result = await controller.create(user, {
        fullName: 'Ana Gomez',
        primaryEmail: 'ana@example.com',
        identity: { documentType: 'CC', documentNumber: '54321' },
      } as any);

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(CreateGuestCommand),
      );
      const dispatchedCommand = commandBus.execute.mock.calls[0][0];
      expect(dispatchedCommand.preferences).toBeUndefined();
      expect(result).toEqual({
        message: 'Guest created successfully',
        data: { guestId: 'guest-2' },
      });
    });

    it('dispatches CreateGuestCommand and returns the created guest id', async () => {
      commandBus.execute.mockResolvedValue({ guestId: 'guest-1' });

      const result = await controller.create(user, {
        fullName: 'Juan Perez',
        primaryEmail: 'juan@example.com',
        identity: { documentType: 'CC', documentNumber: '12345' },
        firstName: 'Juan',
        lastName: 'Perez',
        phone: '+573000000000',
        tags: ['vip'],
        preferences: [{ catalogItemId: 'pref-1' }],
      } as any);

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(CreateGuestCommand),
      );
      expect(result).toEqual({
        message: 'Guest created successfully',
        data: { guestId: 'guest-1' },
      });
    });
  });

  describe('getAll', () => {
    it('looks up by document number when provided and a guest is found', async () => {
      findGuestByDocumentNumberQuery.execute.mockResolvedValue(guest);

      const result = await controller.getAll(user, '', '12345');

      expect(findGuestByDocumentNumberQuery.execute).toHaveBeenCalledWith(
        expect.any(TenantId),
        '12345',
      );
      expect(searchGuestsQuery.execute).not.toHaveBeenCalled();
      expect(result.total).toBe(1);
      expect(result.data).toEqual([
        expect.objectContaining({
          fullName: 'Juan Perez',
          primaryEmail: 'juan@example.com',
          tags: ['VIP'],
        }),
      ]);
    });

    it('returns an empty list when document number lookup finds nothing', async () => {
      findGuestByDocumentNumberQuery.execute.mockResolvedValue(null);

      const result = await controller.getAll(user, '', 'unknown-doc');

      expect(result).toEqual({
        message: 'Guests retrieved successfully',
        data: [],
        total: 0,
      });
    });

    it('ignores a blank documentNumber and falls back to the search query', async () => {
      searchGuestsQuery.execute.mockResolvedValue({
        guests: [guest],
        total: 1,
      });

      const result = await controller.getAll(user, 'juan', '   ');

      expect(findGuestByDocumentNumberQuery.execute).not.toHaveBeenCalled();
      expect(searchGuestsQuery.execute).toHaveBeenCalledWith(
        expect.any(TenantId),
        'juan',
        1,
        1000,
        'createdAt',
        'desc',
      );
      expect(result.total).toBe(1);
      expect(result.data[0]).toMatchObject({ fullName: 'Juan Perez' });
    });

    it('searches by term when no documentNumber is given', async () => {
      searchGuestsQuery.execute.mockResolvedValue({ guests: [], total: 0 });

      const result = await controller.getAll(user, 'term');

      expect(searchGuestsQuery.execute).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Guests retrieved successfully',
        data: [],
        total: 0,
      });
    });

    it('defaults term to an empty string when omitted entirely', async () => {
      searchGuestsQuery.execute.mockResolvedValue({ guests: [], total: 0 });

      await controller.getAll(user);

      expect(searchGuestsQuery.execute).toHaveBeenCalledWith(
        expect.any(TenantId),
        '',
        1,
        1000,
        'createdAt',
        'desc',
      );
    });
  });

  describe('changePassword', () => {
    it('dispatches ChangeGuestPasswordCommand and returns the result message', async () => {
      commandBus.execute.mockResolvedValue({
        message: 'Password changed successfully',
      });

      const result = await controller.changePassword(guestJwtPayload, {
        currentPassword: 'old-pass',
        newPassword: 'new-pass',
      });

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(ChangeGuestPasswordCommand),
      );
      expect(result).toEqual({ message: 'Password changed successfully' });
    });
  });

  describe('getProfile', () => {
    it('dispatches GetGuestAccountProfileQuery and shapes the response', async () => {
      queryBus.execute.mockResolvedValue({
        guestAccountId: 'guest-account-1',
        email: 'juan@example.com',
        fullName: 'Juan Perez',
        firstName: 'Juan',
        lastName: 'Perez',
        emailVerified: true,
        profilePhotoUrl: 'https://photo',
      });

      const result = await controller.getProfile(guestJwtPayload);

      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.any(GetGuestAccountProfileQuery),
      );
      expect(result).toEqual({
        message: 'Guest profile returned',
        data: {
          guestAccountId: 'guest-account-1',
          email: 'juan@example.com',
          fullName: 'Juan Perez',
          firstName: 'Juan',
          lastName: 'Perez',
          emailVerified: true,
          profilePhotoUrl: 'https://photo',
        },
      });
    });
  });

  describe('getProfilePhotoUploadUrl', () => {
    it('dispatches GenerateGuestProfilePhotoUrlQuery and returns presigned data', async () => {
      queryBus.execute.mockResolvedValue({
        presignedUrl: 'https://presigned',
        fileUrl: 'https://file',
        key: 'key-1',
      });

      const result = await controller.getProfilePhotoUploadUrl(
        guestJwtPayload,
        { contentType: 'image/png', fileSize: 1024 } as any,
      );

      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.any(GenerateGuestProfilePhotoUrlQuery),
      );
      expect(result).toEqual({
        message: 'Presigned URL generated',
        data: {
          presignedUrl: 'https://presigned',
          fileUrl: 'https://file',
          key: 'key-1',
        },
      });
    });
  });

  describe('saveProfilePhoto', () => {
    it('dispatches UpdateGuestProfilePhotoCommand and returns the new photo url', async () => {
      commandBus.execute.mockResolvedValue({
        profilePhotoUrl: 'https://new-photo',
      });

      const result = await controller.saveProfilePhoto(guestJwtPayload, {
        key: 'key-1',
      });

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(UpdateGuestProfilePhotoCommand),
      );
      expect(result).toEqual({
        message: 'Profile photo updated successfully',
        data: { profilePhotoUrl: 'https://new-photo' },
      });
    });
  });

  describe('updateOwnProfile', () => {
    it('dispatches UpdateGuestAccountProfileCommand and returns the result message', async () => {
      commandBus.execute.mockResolvedValue({
        message: 'Profile updated successfully',
      });

      const result = await controller.updateOwnProfile(guestJwtPayload, {
        firstName: 'Juan',
        lastName: 'Perez',
        phone: '+573000000000',
        email: 'juan@example.com',
      } as any);

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(UpdateGuestAccountProfileCommand),
      );
      expect(result).toEqual({ message: 'Profile updated successfully' });
    });
  });

  describe('getById', () => {
    it('dispatches GetGuestByIdQuery and returns the guest profile', async () => {
      queryBus.execute.mockResolvedValue({ item: { id: 'guest-1' } });

      const result = await controller.getById(user, 'guest-1');

      expect(queryBus.execute).toHaveBeenCalledWith(
        expect.any(GetGuestByIdQuery),
      );
      expect(result).toEqual({
        message: 'Guest profile retrieved successfully',
        data: { id: 'guest-1' },
      });
    });

    it('throws NotFoundException when the guest does not exist', async () => {
      queryBus.execute.mockResolvedValue({ item: null });

      await expect(controller.getById(user, 'missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateProfile', () => {
    it('dispatches UpdateGuestProfileCommand and returns a success message', async () => {
      commandBus.execute.mockResolvedValue(undefined);

      const result = await controller.updateProfile(user, 'guest-1', {
        fullName: 'Juan Perez',
        firstName: 'Juan',
        lastName: 'Perez',
        primaryEmail: 'juan@example.com',
        phone: '+573000000000',
        identity: { documentType: 'CC', documentNumber: '12345' },
      } as any);

      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(UpdateGuestProfileCommand),
      );
      expect(result).toEqual({
        message: 'Guest profile updated successfully',
      });
    });
  });
});
