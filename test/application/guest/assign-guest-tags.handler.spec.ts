import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AssignGuestTagsHandler } from '@/application/guest/commands/assign-guest-tags.handler';
import { AssignGuestTagsCommand } from '@/application/guest/commands/assign-guest-tags.command';
import { GuestRepository } from '@/domain/guest/repositories/guest.repository';
import { GuestTagRepository } from '@/domain/guest-tag/repositories/guest-tag.repository';
import { createGuestRepositoryMock } from '@test/shared/mocks/repositories/guest-repository.mock';
import { createGuestTagRepositoryMock } from '@test/shared/mocks/repositories/guest-tag-repository.mock';
import {
  makeGuest,
  GUEST_FIXTURE_DEFAULTS,
} from '@test/shared/fixtures/guest.fixture';
import { makeGuestTag } from '@test/shared/fixtures/guest-tag.fixture';

const TENANT_ID = GUEST_FIXTURE_DEFAULTS.tenantId;
const GUEST_ID = GUEST_FIXTURE_DEFAULTS.id;

describe('AssignGuestTagsHandler', () => {
  let handler: AssignGuestTagsHandler;
  let guestRepository: jest.Mocked<GuestRepository>;
  let tagRepository: jest.Mocked<GuestTagRepository>;

  let mockEventEmitter: { emit: jest.Mock };

  beforeEach(() => {
    guestRepository = createGuestRepositoryMock();
    tagRepository = createGuestTagRepositoryMock();
    mockEventEmitter = { emit: jest.fn() };
    handler = new AssignGuestTagsHandler(guestRepository, tagRepository, mockEventEmitter as any);
  });

  describe('when all tags exist in the catalog', () => {
    it('assigns validated GuestTag objects to the guest and saves', async () => {
      const vip = makeGuestTag({ name: 'vip' });
      const family = makeGuestTag({
        name: 'family',
        id: '65f1a1a2-b3c4-d5e6-f700-000200000000',
      });

      tagRepository.findByNames.mockResolvedValue([vip, family]);
      const guest = makeGuest();
      guestRepository.findById.mockResolvedValue(guest);
      guestRepository.save.mockResolvedValue(GUEST_ID);

      const command = new AssignGuestTagsCommand(
        GUEST_ID,
        ['vip', 'family'],
        TENANT_ID,
        'actor-id',
        'actor@test.com',
      );
      await handler.execute(command);

      expect(tagRepository.findByNames).toHaveBeenCalledWith(
        ['vip', 'family'],
        TENANT_ID,
      );
      expect(guestRepository.save).toHaveBeenCalledTimes(1);
      const savedGuest = guestRepository.save.mock.calls[0][0];
      expect(savedGuest.getTags().map((t) => t.getName())).toEqual([
        'vip',
        'family',
      ]);
    });
  });

  describe('when tags are submitted in mixed case', () => {
    it('normalizes to lowercase before catalog lookup', async () => {
      const vip = makeGuestTag({ name: 'vip' });
      tagRepository.findByNames.mockResolvedValue([vip]);
      const guest = makeGuest();
      guestRepository.findById.mockResolvedValue(guest);
      guestRepository.save.mockResolvedValue(GUEST_ID);

      const command = new AssignGuestTagsCommand(
        GUEST_ID,
        ['VIP', '  Vip  '],
        TENANT_ID,
        'actor-id',
        'actor@test.com',
      );
      await handler.execute(command);

      expect(tagRepository.findByNames).toHaveBeenCalledWith(
        ['vip'],
        TENANT_ID,
      );
    });
  });

  describe('when duplicate tags are submitted', () => {
    it('deduplicates before catalog lookup', async () => {
      const vip = makeGuestTag({ name: 'vip' });
      tagRepository.findByNames.mockResolvedValue([vip]);
      const guest = makeGuest();
      guestRepository.findById.mockResolvedValue(guest);
      guestRepository.save.mockResolvedValue(GUEST_ID);

      const command = new AssignGuestTagsCommand(
        GUEST_ID,
        ['vip', 'vip', 'VIP'],
        TENANT_ID,
        'actor-id',
        'actor@test.com',
      );
      await handler.execute(command);

      expect(tagRepository.findByNames).toHaveBeenCalledWith(
        ['vip'],
        TENANT_ID,
      );
    });
  });

  describe('when one or more tags are not in the catalog', () => {
    it('throws BadRequestException listing the unknown tags', async () => {
      const vip = makeGuestTag({ name: 'vip' });
      tagRepository.findByNames.mockResolvedValue([vip]);

      const command = new AssignGuestTagsCommand(
        GUEST_ID,
        ['vip', 'nonexistent', 'another-unknown'],
        TENANT_ID,
        'actor-id',
        'actor@test.com',
      );

      await expect(handler.execute(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(handler.execute(command)).rejects.toThrow(
        'Unknown tag(s): nonexistent, another-unknown',
      );
      expect(guestRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('when all submitted tags are unknown', () => {
    it('throws BadRequestException', async () => {
      tagRepository.findByNames.mockResolvedValue([]);

      const command = new AssignGuestTagsCommand(
        GUEST_ID,
        ['ghost'],
        TENANT_ID,
        'actor-id',
        'actor@test.com',
      );

      await expect(handler.execute(command)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('when tags is an empty array', () => {
    it('clears the guest tags', async () => {
      tagRepository.findByNames.mockResolvedValue([]);
      const guest = makeGuest();
      guestRepository.findById.mockResolvedValue(guest);
      guestRepository.save.mockResolvedValue(GUEST_ID);

      const command = new AssignGuestTagsCommand(GUEST_ID, [], TENANT_ID, 'actor-id', 'actor@test.com');
      await handler.execute(command);

      expect(tagRepository.findByNames).toHaveBeenCalledWith([], TENANT_ID);
      expect(guestRepository.save).toHaveBeenCalledTimes(1);
      const savedGuest = guestRepository.save.mock.calls[0][0];
      expect(savedGuest.getTags()).toEqual([]);
    });
  });

  describe('when the guest does not exist', () => {
    it('throws NotFoundException', async () => {
      tagRepository.findByNames.mockResolvedValue([
        makeGuestTag({ name: 'vip' }),
      ]);
      guestRepository.findById.mockResolvedValue(null);

      const command = new AssignGuestTagsCommand(GUEST_ID, ['vip'], TENANT_ID, 'actor-id', 'actor@test.com');

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    });
  });

  describe('when the guest belongs to a different tenant', () => {
    it('throws ForbiddenException', async () => {
      tagRepository.findByNames.mockResolvedValue([
        makeGuestTag({ name: 'vip' }),
      ]);
      const guest = makeGuest({ tenantId: 'different-tenant-000000000' });
      guestRepository.findById.mockResolvedValue(guest);

      const command = new AssignGuestTagsCommand(GUEST_ID, ['vip'], TENANT_ID, 'actor-id', 'actor@test.com');

      await expect(handler.execute(command)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
