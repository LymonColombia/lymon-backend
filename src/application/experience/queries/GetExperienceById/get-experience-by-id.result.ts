import {
  ExperienceUnitSummaryDto,
  PublicExperienceDto,
} from '@/application/experience/queries/shared/experience-read.dto';

export class GetExperienceByIdResult {
  constructor(
    public readonly experience: PublicExperienceDto,
    public readonly propertyName: string | null,
    public readonly units: ExperienceUnitSummaryDto[],
  ) {}
}
