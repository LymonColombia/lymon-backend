import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PersistenceModule } from '@/infrastructure/persistence/persistence.module';
import { StorageModule } from '@/infrastructure/storage/storage.module';
import { CreateExperienceHandler } from '@/application/experience/commands/create-experience.handler';
import { UpdateExperienceHandler } from '@/application/experience/commands/update-experience/update-experience.handler';
import { DeleteExperienceHandler } from '@/application/experience/commands/delete-experience.handler';
import { GetExperiencesByTenantQueryHandler } from '@/application/experience/queries/GetExperiencesByTenant/get-experiences-by-tenant.query-handler';
import { GetAvailableExperiencesQueryHandler } from '@/application/experience/queries/GetAvailableExperiences/get-available-experiences.query-handler';
import { GetExperienceByIdQueryHandler } from '@/application/experience/queries/GetExperienceById/get-experience-by-id.query-handler';
import { GetAvailableExperienceByIdQueryHandler } from '@/application/experience/queries/GetAvailableExperienceById/get-available-experience-by-id.query-handler';

const CommandHandlers = [
  CreateExperienceHandler,
  UpdateExperienceHandler,
  DeleteExperienceHandler,
];
const QueryHandlers = [
  GetExperiencesByTenantQueryHandler,
  GetAvailableExperiencesQueryHandler,
  GetExperienceByIdQueryHandler,
  GetAvailableExperienceByIdQueryHandler,
];

@Module({
  imports: [CqrsModule, PersistenceModule, StorageModule],
  providers: [...CommandHandlers, ...QueryHandlers],
  exports: [...CommandHandlers, ...QueryHandlers],
})
export class ExperienceApplicationModule {}
