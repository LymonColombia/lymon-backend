import { CreateGuestNoteHandler } from '@/application/guest-note/commands/create-guest-note.handler';
import { CreateGuestNoteCommand } from '@/application/guest-note/commands/create-guest-note.command';
import { GuestNoteRepository } from '@/domain/guest-note/repositories/guest-note.repository';
import { GuestRepository } from '@/domain/guest/repositories/guest.repository';
import { createGuestRepositoryMock } from '@test/shared/mocks/repositories/guest-repository.mock';
import { makeGuest } from '@test/shared/fixtures/guest.fixture';
import { GuestNoteTypeEnum } from '@/domain/guest-note/value-objects/guest-node-type.vo';
import { GuestNoteStatusEnum } from '@/domain/guest-note/value-objects/guest-node-status.vo';
import {
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

function createGuestNoteRepositoryMock(): jest.Mocked<GuestNoteRepository> {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findByGuestId: jest.fn(),
    delete: jest.fn(),
    findByGuestIdPaginated: jest.fn(),
  };
}

describe('CreateGuestNoteHandler', () => {
  let handler: CreateGuestNoteHandler;
  let guestRepository: jest.Mocked<GuestRepository>;
  let guestNoteRepository: jest.Mocked<GuestNoteRepository>;

  const defaultProps = {
    tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
    guestId: '65f1a1a2-b3c4-d5e6-f7a8-b9d100000000',
    note: 'Valid note content for testing',
    type: GuestNoteTypeEnum.GENERAL,
    createdBy: 'user-123',
    status: GuestNoteStatusEnum.NOT_PINNED,
  };

  let mockEventEmitter: { emit: jest.Mock };

  beforeEach(() => {
    guestRepository = createGuestRepositoryMock();
    guestNoteRepository = createGuestNoteRepositoryMock();
    mockEventEmitter = { emit: jest.fn() };
    handler = new CreateGuestNoteHandler(guestNoteRepository, guestRepository, mockEventEmitter as any);
  });

  describe('Validation errors (DTO equivalent coverage in handler)', () => {
    it('Lanza ForbiddenException("Tenant context is required") si falta el tenantId', async () => {
      const command = new CreateGuestNoteCommand(
        '', // tenantId vacío
        defaultProps.guestId,
        defaultProps.note,
        defaultProps.type,
        defaultProps.createdBy,
        'actor@test.com',
        defaultProps.status,
      );

      await expect(handler.execute(command)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(handler.execute(command)).rejects.toThrow(
        'Tenant context is required',
      );
    });

    it('Lanza BadRequestException("Note content cannot be empty") para nota vacía', async () => {
      const command = new CreateGuestNoteCommand(
        defaultProps.tenantId,
        defaultProps.guestId,
        '   ', // nota con solo espacios
        defaultProps.type,
        defaultProps.createdBy,
        'actor@test.com',
        defaultProps.status,
      );

      await expect(handler.execute(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(handler.execute(command)).rejects.toThrow(
        'Note content cannot be empty',
      );
    });

    it('Lanza BadRequestException (Validation Error) para tipo de nota inválido', async () => {
      const command = new CreateGuestNoteCommand(
        defaultProps.tenantId,
        defaultProps.guestId,
        defaultProps.note,
        'INTERNAL_SECRET' as any, // Tipo inválido forzado
        defaultProps.createdBy,
        'actor@test.com',
        defaultProps.status,
      );

      await expect(handler.execute(command)).rejects.toThrow(
        BadRequestException,
      );
      await expect(handler.execute(command)).rejects.toThrow(
        'Invalid note type',
      );
    });
  });

  describe('Business rules and Guest existence', () => {
    it('Lanza NotFoundException("Guest not found") con un guestId que no existe en el repositorio', async () => {
      guestRepository.findById.mockResolvedValue(null);

      const command = new CreateGuestNoteCommand(
        defaultProps.tenantId,
        defaultProps.guestId,
        defaultProps.note,
        defaultProps.type,
        defaultProps.createdBy,
        'actor@test.com',
        defaultProps.status,
      );

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(command)).rejects.toThrow('Guest not found');
      expect(guestRepository.findById).toHaveBeenCalled();
      expect(guestNoteRepository.save).not.toHaveBeenCalled();
    });

    it('Lanza ForbiddenException para Creador no autorizado (guest pertenece a otro tenant)', async () => {
      const guest = makeGuest({ tenantId: 'other-tenant-999' });
      guestRepository.findById.mockResolvedValue(guest);

      const command = new CreateGuestNoteCommand(
        defaultProps.tenantId,
        defaultProps.guestId,
        defaultProps.note,
        defaultProps.type,
        defaultProps.createdBy,
        'actor@test.com',
        defaultProps.status,
      );

      await expect(handler.execute(command)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(handler.execute(command)).rejects.toThrow(
        'Creator not authorized for this guest tenant',
      );
      expect(guestNoteRepository.save).not.toHaveBeenCalled();
    });

    it('Creación exitosa: Retorna GuestNoteResult (con ID generado y timestamps)', async () => {
      const guest = makeGuest({ tenantId: defaultProps.tenantId });
      guestRepository.findById.mockResolvedValue(guest);
      guestNoteRepository.save.mockResolvedValue();

      const command = new CreateGuestNoteCommand(
        defaultProps.tenantId,
        defaultProps.guestId,
        defaultProps.note,
        defaultProps.type,
        defaultProps.createdBy,
        'actor@test.com',
        defaultProps.status,
      );

      const result = await handler.execute(command);

      expect(result).toBeDefined();
      expect(typeof result.guestNoteId).toBe('string');
      expect(guestNoteRepository.save).toHaveBeenCalledTimes(1);

      const savedNote = guestNoteRepository.save.mock.calls[0][0];
      expect(savedNote.getNote()).toBe(defaultProps.note);
      expect(savedNote.getType()).toBe(defaultProps.type);
      expect(savedNote.getTenantId().toString()).toBe(defaultProps.tenantId);
      expect(savedNote.getGuestId().toString()).toBe(defaultProps.guestId);
      expect(savedNote.getCreatedAt()).toBeInstanceOf(Date);
    });
  });
});
