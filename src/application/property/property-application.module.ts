import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreatePropertyHandler } from '@/application/property/commands/create-property.handler';
import { UpdatePropertyHandler } from '@/application/property/commands/update-property.handler';
import { DeletePropertyHandler } from '@/application/property/commands/delete-property.handler';
import { GetPropertiesByTenantQueryHandler } from '@/application/property/queries/GetPropertiesByTenant/get-properties-by-tenant.query-handler';
import { GetPropertyByIdQueryHandler } from '@/application/property/queries/GetPropertyById/get-property-by-id.query-handler';
import { PersistenceModule } from '@/infrastructure/persistence/persistence.module';
import { StorageModule } from '@/infrastructure/storage/storage.module';

const CommandHandlers = [
  CreatePropertyHandler,
  UpdatePropertyHandler,
  DeletePropertyHandler,
];
const QueryHandlers = [
  GetPropertiesByTenantQueryHandler,
  GetPropertyByIdQueryHandler,
];

@Module({
  imports: [CqrsModule, PersistenceModule, StorageModule],
  providers: [...CommandHandlers, ...QueryHandlers],
  exports: [...CommandHandlers, ...QueryHandlers],
})
export class PropertyApplicationModule {}
