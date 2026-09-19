import { GuestNoteRepository } from '@/domain/guest-note/repositories/guest-note.repository';

export function createGuestNoteRepositoryMock(): jest.Mocked<GuestNoteRepository> {
  return {
    save: jest.fn(),
    findById: jest.fn(),
    findByGuestId: jest.fn(),
    findByGuestIdPaginated: jest.fn(),
    delete: jest.fn(),
  };
}
