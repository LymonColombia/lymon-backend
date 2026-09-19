import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PersistenceModule } from '@/infrastructure/persistence/persistence.module';
import { GetStaffByTenantHandler } from './queries/get-staff-by-tenant/get-staff-by-tenant.handler';
import { DeleteUserHandler } from './commands/delete-user/delete-user.handler';

const CommandHandlers = [DeleteUserHandler];
const QueryHandlers = [GetStaffByTenantHandler];

@Module({
  imports: [CqrsModule, PersistenceModule],
  providers: [...CommandHandlers, ...QueryHandlers],
  exports: [...CommandHandlers, ...QueryHandlers],
})
export class UserApplicationModule {}
