import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { LowStockAlertListener } from './listeners/low-stock-alert.listener';
import { EmailModule } from '@/infrastructure/email/email.module';
import { PersistenceModule } from '@/infrastructure/persistence/persistence.module';

@Module({
  imports: [CqrsModule, EmailModule, PersistenceModule],
  providers: [LowStockAlertListener],
})
export class InventoryInfrastructureModule {}
