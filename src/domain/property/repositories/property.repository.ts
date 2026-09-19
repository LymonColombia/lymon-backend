import { Property } from '@/domain/property/entities/property.entity';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import { TransactionContextData } from '@/domain/shared/transaction-manager.interface';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

export const PROPERTY_REPOSITORY = 'PROPERTY_REPOSITORY';

export interface PropertyRepository {
  save(
    property: Property,
    transactionContext?: TransactionContextData,
  ): Promise<string>;
  findById(id: PropertyId): Promise<Property | null>;
  findByTenantIdAndSlug(
    tenantId: TenantId,
    slug: string,
  ): Promise<Property | null>;
  findByTenantId(tenantId: TenantId): Promise<Property[]>;
  countByTenantId(tenantId: TenantId): Promise<number>;
  delete(id: PropertyId): Promise<void>;
}
