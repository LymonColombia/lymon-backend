import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PersistenceModule } from '@/infrastructure/persistence/persistence.module';
import { StorageModule } from '@/infrastructure/storage/storage.module';
import { UpdateTenantProfileHandler } from '@/application/tenant/commands/update-tenant-profile.handler';
import { GetTenantProfileQueryHandler } from '@/application/tenant/queries/GetTenantProfile/get-tenant-profile.query-handler';
import { DeleteTenantHandler } from './commands/delete-tenant/delete-tenant.handler';

const CommandHandlers = [UpdateTenantProfileHandler, DeleteTenantHandler];
const QueryHandlers = [GetTenantProfileQueryHandler];

@Module({
  imports: [CqrsModule, PersistenceModule, StorageModule],
  providers: [...CommandHandlers, ...QueryHandlers],
  exports: [...CommandHandlers, ...QueryHandlers],
})
export class TenantApplicationModule {}
