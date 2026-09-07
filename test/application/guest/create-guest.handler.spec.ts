import { ConflictException } from '@nestjs/common';
import { CreateGuestHandler } from '@/application/guest/commands/create-guest.handler';
import { CreateGuestCommand } from '@/application/guest/commands/create-guest.command';
import { CreateGuestResult } from '@/application/guest/commands/create-guest.result';
import { Guest } from '@/domain/guest/entities/guest.entity';
import { GuestRepository } from '@/domain/guest/repositories/guest.repository';
import { CatalogPreferenceBuilderService } from '@/application/guest-preference/services/catalog-preference-builder.service';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { createGuestRepositoryMock } from '@test/shared/mocks/repositories/guest-repository.mock';
import { createCatalogPreferenceBuilderMock } from '@test/shared/mocks/services/catalog-preference-builder.mock';

describe('CreateGuestHandler', () => {
  let handler: CreateGuestHandler;
  let guestRepository: jest.Mocked<GuestRepository>;
  let catalogPreferenceBuilder: jest.Mocked<CatalogPreferenceBuilderService>;

  beforeEach(() => {
    guestRepository = createGuestRepositoryMock();
    catalogPreferenceBuilder = createCatalogPreferenceBuilderMock();
    catalogPreferenceBuilder.build.mockResolvedValue([]);
    handler = new CreateGuestHandler(guestRepository, catalogPreferenceBuilder);
  });

  describe('when the primary email already exists in the tenant', () => {
    it('throws ConflictException', async () => {
      const existingGuest = Guest.create({
        tenantId: TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
        identity: {},
        fullName: 'Existing Guest',
        primaryEmail: 'existing@example.com',
      });
      guestRepository.findByPrimaryEmail.mockResolvedValue(existingGuest);

      const command = new CreateGuestCommand(
        '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
        'John Doe',
        'existing@example.com',
      );

      await expect(handler.execute(command)).rejects.toThrow(ConflictException);
      await expect(handler.execute(command)).rejects.toThrow(
        'A guest with this primary email already exists',
      );

      expect(guestRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('when the document number already exists in the tenant', () => {
    it('throws ConflictException', async () => {
      const existingGuest = Guest.create({
        tenantId: TenantId.createFromString('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000'),
        identity: { documentNumber: 'DOC123' },
        fullName: 'Existing Guest',
        primaryEmail: 'other@example.com',
      });
      guestRepository.findByPrimaryEmail.mockResolvedValue(null);
      guestRepository.findByDocumentNumber.mockResolvedValue(existingGuest);

      const command = new CreateGuestCommand(
        '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
        'John Doe',
        'john@example.com',
        { documentNumber: 'DOC123' },
      );

      await expect(handler.execute(command)).rejects.toThrow(ConflictException);
      await expect(handler.execute(command)).rejects.toThrow(
        'A guest with this document number already exists',
      );

      expect(guestRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('when no document number is provided', () => {
    it('skips the document number check', async () => {
      guestRepository.findByPrimaryEmail.mockResolvedValue(null);
      guestRepository.save.mockResolvedValue('new-guest-id');

      const command = new CreateGuestCommand(
        '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
        'John Doe',
        'john@example.com',
      );

      await handler.execute(command);

      expect(guestRepository.findByDocumentNumber).not.toHaveBeenCalled();
      expect(guestRepository.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('when the primary email is new and data is valid', () => {
    it('creates guest, saves it, and returns result', async () => {
      guestRepository.findByPrimaryEmail.mockResolvedValue(null);
      guestRepository.findByDocumentNumber.mockResolvedValue(null);
      guestRepository.save.mockResolvedValue('new-guest-id');

      const command = new CreateGuestCommand(
        '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
        'Jane Smith',
        'JANE@example.com',
        {
          documentType: 'passport',
          documentNumber: 'AB123456',
          countryCode: 'US',
        },
        'Jane',
        'Smith',
        '+12025550123',
        ['vip'],
      );

      const result = await handler.execute(command);

      // Validates the result type and values
      expect(result).toBeInstanceOf(CreateGuestResult);
      expect(result.guestId).toBe('new-guest-id');

      // Validates lookup was scoped by tenant + primary email
      expect(guestRepository.findByPrimaryEmail).toHaveBeenCalledTimes(1);
      const [calledTenantId] = guestRepository.findByPrimaryEmail.mock
        .calls[0] as [TenantId, string];
      expect(calledTenantId.toString()).toBe('65f1a1a2-b3c4-d5e6-f7a8-b9c000000000');
      expect(guestRepository.findByPrimaryEmail).toHaveBeenCalledWith(
        expect.any(TenantId),
        'JANE@example.com',
      );

      // Validates guest was saved with normalized and mapped values
      expect(guestRepository.save).toHaveBeenCalledTimes(1);
      const savedGuest: Guest = guestRepository.save.mock.calls[0][0];
      expect(savedGuest.getTenantId().toString()).toBe(
        '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
      );
      expect(savedGuest.getFullName()).toBe('Jane Smith');
      expect(savedGuest.getPrimaryEmail()).toBe('jane@example.com');
      expect(savedGuest.getIdentity()).toEqual({
        documentType: 'passport',
        documentNumber: 'AB123456',
        countryCode: 'US',
      });
      expect(savedGuest.getFirstName()).toBe('Jane');
      expect(savedGuest.getLastName()).toBe('Smith');
      expect(savedGuest.getPhone()).toBe('+12025550123');
      expect(savedGuest.getTags()).toEqual([]);
      expect(savedGuest.getPreferences()).toEqual([]);
    });
  });
});
