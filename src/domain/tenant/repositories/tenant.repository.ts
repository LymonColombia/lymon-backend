import { Tenant } from '@/domain/tenant/entities/tenant.entity';
import { Email } from '@/domain/shared/value-objects/email.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

export interface TenantRepository {
  save(tenant: Tenant): Promise<void>;
  findById(id: TenantId): Promise<Tenant | null>;
  findBySlug(slug: string): Promise<Tenant | null>;
  findByOwnerEmail(email: Email): Promise<Tenant | null>;
  exists(email: Email): Promise<boolean>;
}

export const TENANT_REPOSITORY = 'TENANT_REPOSITORY';
