import { Experience } from '@/domain/experience/entities/experience.entity';
import { ExperienceCategory } from '@/domain/experience/value-objects/experience-category.vo';
import { ExperienceId } from '@/domain/experience/value-objects/experience-id.vo';
import { ExperienceScopeEnum } from '@/domain/experience/value-objects/experience-scope.vo';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { TransactionContextData } from '@/domain/shared/transaction-manager.interface';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

export const EXPERIENCE_REPOSITORY = 'EXPERIENCE_REPOSITORY';

export interface AvailableExperienceFilters {
  tenantId?: TenantId;
  propertyId?: PropertyId;
  category?: ExperienceCategory;
  scope?: ExperienceScopeEnum;
  city?: string;
  sortByPrice?: 'asc' | 'desc';
}

export interface ExperienceRepository {
  save(
    experience: Experience,
    transactionContext?: TransactionContextData,
  ): Promise<string>;
  findById(id: ExperienceId): Promise<Experience | null>;
  existsByPropertyIdAndName(
    propertyId: PropertyId,
    name: string,
  ): Promise<boolean>;
  findByTenantIdPaginated(
    tenantId: TenantId,
    page: number,
    limit: number,
    propertyId?: PropertyId,
    minCapacity?: number,
  ): Promise<{ experiences: Experience[]; total: number }>;
  findAvailableForGuestPaginated(
    filters: AvailableExperienceFilters,
    page: number,
    limit: number,
  ): Promise<{ experiences: Experience[]; total: number }>;
  delete(id: ExperienceId): Promise<void>;
}
