import { IQuery } from '@nestjs/cqrs';
import { ExperienceScopeEnum } from '@/domain/experience/value-objects/experience-scope.vo';

export class GetAvailableExperiencesQuery implements IQuery {
  constructor(
    public readonly page: number = 1,
    public readonly limit: number = 10,
    public readonly tenantId?: string,
    public readonly propertyId?: string,
    public readonly category?: string,
    public readonly sortByPrice?: 'asc' | 'desc',
    public readonly scope?: ExperienceScopeEnum,
    public readonly city?: string,
  ) {}
}
