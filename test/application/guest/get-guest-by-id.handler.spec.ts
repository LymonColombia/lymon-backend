import { GetGuestByIdHandler } from '@/application/guest/queries/get-guest-by-id/get-guest-by-id.handler';
import { GetGuestByIdQuery } from '@/application/guest/queries/get-guest-by-id/get-guest-by-id.query';
import { GuestRepository } from '@/domain/guest/repositories/guest.repository';
import { createGuestRepositoryMock } from '@test/shared/mocks/repositories/guest-repository.mock';
import {
  makeGuest,
  GUEST_FIXTURE_DEFAULTS,
} from '@test/shared/fixtures/guest.fixture';
import { GuestStatusEnum } from '@/domain/guest/entities/guest.types';
import { QueryBus } from '@nestjs/cqrs';

describe('GetGuestByIdHandler', () => {
  let handler: GetGuestByIdHandler;
  let guestRepository: jest.Mocked<GuestRepository>;
  let queryBus : QueryBus;

  beforeEach(() => {
    guestRepository = createGuestRepositoryMock();
    queryBus = { execute: jest.fn().mockResolvedValue(new Map()) } as any;
    handler = new GetGuestByIdHandler(guestRepository, queryBus);
  });

  describe('when the guest exists and belongs to the tenant', () => {
    it('returns the guest DTO (TC-01 & TC-03)', async () => {
      const guest = makeGuest({
        fullName: 'John Doe',
        primaryEmail: 'user@example.com',
      });
      guestRepository.findById.mockResolvedValue(guest);

      const query = new GetGuestByIdQuery(
        GUEST_FIXTURE_DEFAULTS.tenantId,
        GUEST_FIXTURE_DEFAULTS.id,
      );

      const result = await handler.execute(query);

      expect(result.item).not.toBeNull();
      expect(result.item?.id).toBe(GUEST_FIXTURE_DEFAULTS.id);
      expect(result.item?.fullName).toBe('John Doe');
      expect(result.item?.primaryEmail).toBe('user@example.com');
      expect(guestRepository.findById).toHaveBeenCalled();
    });
  });

  describe('when the guest exists but belongs to a different tenant', () => {
    it('returns null for security (TC-02)', async () => {
      const guest = makeGuest({ tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c900000000' });
      guestRepository.findById.mockResolvedValue(guest);

      const query = new GetGuestByIdQuery(
        GUEST_FIXTURE_DEFAULTS.tenantId,
        GUEST_FIXTURE_DEFAULTS.id,
      );

      const result = await handler.execute(query);

      expect(result.item).toBeNull();
    });
  });

  describe('when the guest does not exist', () => {
    it('returns null (TC-01.1)', async () => {
      guestRepository.findById.mockResolvedValue(null);

      const query = new GetGuestByIdQuery(
        GUEST_FIXTURE_DEFAULTS.tenantId,
        GUEST_FIXTURE_DEFAULTS.id,
      );

      const result = await handler.execute(query);

      expect(result.item).toBeNull();
    });
  });

  describe('when data has specific formats', () => {
    it('should return phone number correctly (TC-04)', async () => {
      const phone = '+573001234567';
      const guest = makeGuest({
        identity: {
          documentType: 'passport',
          documentNumber: 'TC04',
          countryCode: 'CO',
        },
      });

      jest
        .spyOn(guest, 'getPhone')
        .mockReturnValue(phone);

      guestRepository.findById.mockResolvedValue(guest);

      const query = new GetGuestByIdQuery(
        GUEST_FIXTURE_DEFAULTS.tenantId,
        GUEST_FIXTURE_DEFAULTS.id,
      );
      const result = await handler.execute(query);

      expect(result.item?.phone).toBe(phone);
    });

    it('should handle Blocked status (TC-05)', async () => {
      const guest = makeGuest({ status: GuestStatusEnum.BLOCKED });
      guestRepository.findById.mockResolvedValue(guest);

      const query = new GetGuestByIdQuery(
        GUEST_FIXTURE_DEFAULTS.tenantId,
        GUEST_FIXTURE_DEFAULTS.id,
      );
      const result = await handler.execute(query);

      expect(result.item?.status).toBe(GuestStatusEnum.BLOCKED);
    });

    it('should handle optional fields as null (TC-06)', async () => {
      const guest = makeGuest();
      guestRepository.findById.mockResolvedValue(guest);

      const query = new GetGuestByIdQuery(
        GUEST_FIXTURE_DEFAULTS.tenantId,
        GUEST_FIXTURE_DEFAULTS.id,
      );
      const result = await handler.execute(query);

      expect(result.item?.firstName).toBeNull();
      expect(result.item?.lastName).toBeNull();
      expect(result.item?.preferences).toEqual([]);
    });
  });

  describe('when the guest ID format is invalid', () => {
    it('returns null and does not call repository', async () => {
      const query = new GetGuestByIdQuery(GUEST_FIXTURE_DEFAULTS.tenantId, '');
      const result = await handler.execute(query);

      expect(result.item).toBeNull();
      expect(guestRepository.findById).not.toHaveBeenCalled();
    });
  });
});
