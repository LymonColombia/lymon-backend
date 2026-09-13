import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UpdateGuestNoteHandler } from '@/application/guest-note/commands/update-guest-note.handler';
import { UpdateGuestNoteCommand } from '@/application/guest-note/commands/update-guest-note.command';
import { GuestNoteRepository } from '@/domain/guest-note/repositories/guest-note.repository';
import { GuestNoteTypeEnum } from '@/domain/guest-note/value-objects/guest-node-type.vo';
import { createGuestNoteRepositoryMock } from '@test/shared/mocks/repositories/guest-note-repository.mock';
import {
  makeGuestNote,
  GUEST_NOTE_FIXTURE_DEFAULTS,
} from '@test/shared/fixtures/guest-note.fixture';

describe('UpdateGuestNoteHandler', () => {
  let handler: UpdateGuestNoteHandler;
  let guestNoteRepository: jest.Mocked<GuestNoteRepository>;

  let mockEventEmitter: { emit: jest.Mock };

  beforeEach(() => {
    guestNoteRepository = createGuestNoteRepositoryMock();
    mockEventEmitter = { emit: jest.fn() };
    handler = new UpdateGuestNoteHandler(guestNoteRepository, mockEventEmitter as any);
  });

  describe('when no fields are provided', () => {
    it('throws BadRequestException', async () => {
      await expect(
        handler.execute(
          new UpdateGuestNoteCommand(
            GUEST_NOTE_FIXTURE_DEFAULTS.tenantId,
            GUEST_NOTE_FIXTURE_DEFAULTS.id,
            '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000',
            'actor@test.com',
            undefined,
            undefined,
          ),
        ),
      ).rejects.toThrow(BadRequestException);

      expect(guestNoteRepository.findById).not.toHaveBeenCalled();
    });
  });

  describe('when the note does not exist', () => {
    it('throws NotFoundException', async () => {
      guestNoteRepository.findById.mockResolvedValue(null);

      await expect(
        handler.execute(
          new UpdateGuestNoteCommand(
            GUEST_NOTE_FIXTURE_DEFAULTS.tenantId,
            GUEST_NOTE_FIXTURE_DEFAULTS.id,
            '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000',
            'actor@test.com',
            'Updated content',
            undefined,
          ),
        ),
      ).rejects.toThrow(NotFoundException);

      expect(guestNoteRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('when only note text is updated', () => {
    it('updates the note content and saves', async () => {
      const guestNote = makeGuestNote();
      guestNoteRepository.findById.mockResolvedValue(guestNote);

      await handler.execute(
        new UpdateGuestNoteCommand(
          GUEST_NOTE_FIXTURE_DEFAULTS.tenantId,
          GUEST_NOTE_FIXTURE_DEFAULTS.id,
          '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000',
          'actor@test.com',
          'New note content',
          undefined,
        ),
      );

      expect(guestNoteRepository.save).toHaveBeenCalledTimes(1);
      const saved = guestNoteRepository.save.mock.calls[0][0];
      expect(saved.getNote()).toBe('New note content');
      expect(saved.getType()).toBe(GUEST_NOTE_FIXTURE_DEFAULTS.type);
    });
  });

  describe('when only type is updated', () => {
    it('updates the note type and saves', async () => {
      const guestNote = makeGuestNote();
      guestNoteRepository.findById.mockResolvedValue(guestNote);

      await handler.execute(
        new UpdateGuestNoteCommand(
          GUEST_NOTE_FIXTURE_DEFAULTS.tenantId,
          GUEST_NOTE_FIXTURE_DEFAULTS.id,
          '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000',
          'actor@test.com',
          undefined,
          GuestNoteTypeEnum.INCIDENT,
        ),
      );

      expect(guestNoteRepository.save).toHaveBeenCalledTimes(1);
      const saved = guestNoteRepository.save.mock.calls[0][0];
      expect(saved.getType()).toBe(GuestNoteTypeEnum.INCIDENT);
      expect(saved.getNote()).toBe(GUEST_NOTE_FIXTURE_DEFAULTS.note);
    });
  });

  describe('when both note and type are updated', () => {
    it('updates both fields and saves once', async () => {
      const guestNote = makeGuestNote();
      guestNoteRepository.findById.mockResolvedValue(guestNote);

      await handler.execute(
        new UpdateGuestNoteCommand(
          GUEST_NOTE_FIXTURE_DEFAULTS.tenantId,
          GUEST_NOTE_FIXTURE_DEFAULTS.id,
          '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000',
          'actor@test.com',
          'Updated note text',
          GuestNoteTypeEnum.BEHAVIOR,
        ),
      );

      expect(guestNoteRepository.save).toHaveBeenCalledTimes(1);
      const saved = guestNoteRepository.save.mock.calls[0][0];
      expect(saved.getNote()).toBe('Updated note text');
      expect(saved.getType()).toBe(GuestNoteTypeEnum.BEHAVIOR);
    });
  });
});
