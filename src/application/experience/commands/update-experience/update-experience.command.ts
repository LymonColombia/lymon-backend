import { ExperienceChanges } from '@/domain/experience/entities/experience.entity';

export interface ExperienceActor {
  id: string;
  email: string;
}

export class UpdateExperienceCommand {
  constructor(
    public readonly experienceId: string,
    public readonly tenantId: string,
    public readonly changes: ExperienceChanges,
    public readonly actor: ExperienceActor,
  ) {
    if (Object.keys(changes).length === 0) {
      throw new Error('UpdateExperienceCommand: changes must not be empty');
    }
  }
}
