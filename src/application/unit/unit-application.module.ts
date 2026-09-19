import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { CreateUnitHandler } from '@/application/unit/commands/create-unit.handler';
import { DeleteUnitHandler } from '@/application/unit/commands/delete-unit.handler';
import { UpdateUnitHandler } from '@/application/unit/commands/update-unit.handler';
import { GetUnitsByPropertyQueryHandler } from '@/application/unit/queries/GetUnitsByProperty/get-units-by-property.query-handler';
import { GetPublicUnitsByTenantQueryHandler } from '@/application/unit/queries/GetPublicUnitsByTenant/get-public-units-by-tenant.query-handler';
import { GetPublicUnitByIdQueryHandler } from '@/application/unit/queries/GetPublicUnitById/get-public-unit-by-id.query-handler';
import { GetAllPublicUnitsQueryHandler } from '@/application/unit/queries/GetAllPublicUnits/get-all-public-units.query-handler';
import { GetUnitWithExternalIdsByIdQueryHandler } from '@/application/unit/queries/GetUnitWithExternalIdsById/get-unit-with-external-ids-by-id.query-handler';
import { PersistenceModule } from '@/infrastructure/persistence/persistence.module';
import { StorageModule } from '@/infrastructure/storage/storage.module';

const CommandHandlers = [
  CreateUnitHandler,
  DeleteUnitHandler,
  UpdateUnitHandler,
];
const QueryHandlers = [
  GetUnitsByPropertyQueryHandler,
  GetPublicUnitsByTenantQueryHandler,
  GetPublicUnitByIdQueryHandler,
  GetAllPublicUnitsQueryHandler,
  GetUnitWithExternalIdsByIdQueryHandler,
];

@Module({
  imports: [CqrsModule, PersistenceModule, StorageModule],
  providers: [...CommandHandlers, ...QueryHandlers],
  exports: [...CommandHandlers, ...QueryHandlers],
})
export class UnitApplicationModule {}
