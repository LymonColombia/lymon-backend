import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { R2StorageService, R2_STORAGE_SERVICE } from './r2-storage.service';

@Module({
  imports: [ConfigModule],
  providers: [
    R2StorageService,
    {
      provide: R2_STORAGE_SERVICE,
      useExisting: R2StorageService,
    },
  ],
  exports: [R2StorageService, R2_STORAGE_SERVICE],
})
export class StorageModule {}
