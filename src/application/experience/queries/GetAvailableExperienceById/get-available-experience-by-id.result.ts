import {
  PublicExperienceDto,
  ExperienceUnitSummaryDto,
} from '@/application/experience/queries/shared/experience-read.dto';

export class GetAvailableExperienceByIdResult {
  public readonly experience: PublicExperienceDto;
  public readonly propertyName: string | null;
  public readonly units: ExperienceUnitSummaryDto[];

  constructor(data: {
    experience: PublicExperienceDto;
    propertyName: string | null;
    units: ExperienceUnitSummaryDto[];
  }) {
    this.experience = data.experience;
    this.propertyName = data.propertyName;
    this.units = data.units;
  }
}
