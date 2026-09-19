import { Module } from '@nestjs/common';
import { PersistenceModule } from '@/infrastructure/persistence/persistence.module';
import { TenantRegisteredCatalogSeedListener } from '@/infrastructure/guest-preference/listeners/tenant-registered-catalog-seed.listener';

@Module({
  imports: [PersistenceModule],
  providers: [TenantRegisteredCatalogSeedListener],
})
export class GuestPreferenceInfrastructureModule {}
