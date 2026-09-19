import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PersistenceModule } from '@/infrastructure/persistence/persistence.module';
import { ListCatalogItemsByTenantQueryHandler } from '@/application/guest-preference/queries/list-catalog-items-by-tenant/list-catalog-items-by-tenant.query-handler';
import { ToggleCatalogItemHandler } from '@/application/guest-preference/commands/toggle-catalog-item/toggle-catalog-item.handler';
import { CreateCustomCatalogItemHandler } from '@/application/guest-preference/commands/create-custom-catalog-item/create-custom-catalog-item.handler';
import { UpdateCustomCatalogItemHandler } from '@/application/guest-preference/commands/update-custom-catalog-item/update-custom-catalog-item.handler';
import { DeleteCustomCatalogItemHandler } from '@/application/guest-preference/commands/delete-custom-catalog-item/delete-custom-catalog-item.handler';
import { CatalogPreferenceBuilderService } from '@/application/guest-preference/services/catalog-preference-builder.service';

const CommandHandlers = [
  ToggleCatalogItemHandler,
  CreateCustomCatalogItemHandler,
  UpdateCustomCatalogItemHandler,
  DeleteCustomCatalogItemHandler,
];

const QueryHandlers = [ListCatalogItemsByTenantQueryHandler];

@Module({
  imports: [CqrsModule, PersistenceModule],
  providers: [
    ...CommandHandlers,
    ...QueryHandlers,
    CatalogPreferenceBuilderService,
  ],
  exports: [
    ...CommandHandlers,
    ...QueryHandlers,
    CatalogPreferenceBuilderService,
  ],
})
export class GuestPreferenceApplicationModule {}
