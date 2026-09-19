import { PublicExperienceDto } from '@/application/experience/queries/shared/experience-read.dto';

export class GetExperiencesByTenantResult {
  constructor(
    public readonly experiences: PublicExperienceDto[],
    public readonly total: number,
    public readonly page: number,
    public readonly limit: number,
  ) {}

  get totalPages(): number {
    return Math.ceil(this.total / this.limit);
  }
}
