import { R2StorageService } from '@/infrastructure/storage/r2-storage.service';

export function createR2StorageServiceMock(): jest.Mocked<R2StorageService> {
  return {
    generatePresignedPutUrl: jest.fn(),
    getPublicUrl: jest.fn(),
    deleteObjects: jest.fn(),
  } as unknown as jest.Mocked<R2StorageService>;
}
