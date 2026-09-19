import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { StorageModule } from '@/infrastructure/storage/storage.module';
import { GeneratePresignedUrlQueryHandler } from './queries/generate-presigned-url/generate-presigned-url.query-handler';

const QueryHandlers = [GeneratePresignedUrlQueryHandler];

@Module({
  imports: [CqrsModule, StorageModule],
  providers: [...QueryHandlers],
  exports: [...QueryHandlers],
})
export class StorageApplicationModule {}
