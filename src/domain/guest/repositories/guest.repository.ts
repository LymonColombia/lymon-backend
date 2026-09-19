import { Guest } from '@/domain/guest/entities/guest.entity';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { TransactionContextData } from '@/domain/shared/transaction-manager.interface';

export const GUEST_REPOSITORY = 'GUEST_REPOSITORY';

export interface GuestRepository {
  save(
    guest: Guest,
    transactionContext?: TransactionContextData,
  ): Promise<string>;
  findById(id: GuestId): Promise<Guest | null>;
  findByTenantId(tenantId: TenantId): Promise<Guest[]>;
  findByPrimaryEmail(
    tenantId: TenantId,
    primaryEmail: string,
  ): Promise<Guest | null>;
  findByDocumentNumber(
    tenantId: TenantId,
    documentNumber: string,
  ): Promise<Guest | null>;
  findByGuestAccountId(
    tenantId: TenantId,
    guestAccountId: GuestAccountId,
  ): Promise<Guest | null>;
  findAllByGuestAccountId(guestAccountId: GuestAccountId): Promise<Guest[]>;
  countByTenantId(tenantId: TenantId): Promise<number>;
  delete(id: GuestId): Promise<void>;
  search(tenantId: TenantId, term: string): Promise<Guest[]>;
  findByTenantIdPaginated(
    tenantId: TenantId,
    page: number,
    limit: number,
    sortBy: 'createdAt' | 'fullName' | 'status',
    sortDirection: 'asc' | 'desc',
  ): Promise<{ guests: Guest[]; total: number }>;
  searchPaginated(
    tenantId: TenantId,
    term: string,
    page: number,
    limit: number,
  ): Promise<{ guests: Guest[]; total: number }>;
  findByEmailChangeToken(hashedToken: string): Promise<Guest | null>;
}
