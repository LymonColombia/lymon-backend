import { Supplier } from '@/domain/inventory/entities/supplier.entity';
import { SupplierId } from '@/domain/inventory/value-objects/supplier-id.vo';
import { TransactionContextData } from '@/domain/shared/transaction-manager.interface';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

export const SUPPLIER_REPOSITORY = 'SUPPLIER_REPOSITORY';

export type SupplierSortBy = 'name' | 'createdAt';
export type SupplierSortOrder = 'asc' | 'desc';

export type SupplierFindByTenantIdOptions = {
  sortBy?: SupplierSortBy;
  sortOrder?: SupplierSortOrder;
};

export interface SupplierRepository {
  save(
    supplier: Supplier,
    transactionContext?: TransactionContextData,
  ): Promise<string>;
  findByTenantId(
    tenantId: TenantId,
    options?: SupplierFindByTenantIdOptions,
  ): Promise<Supplier[]>;
  findById(id: SupplierId): Promise<Supplier | null>;
  findByNit(tenantId: TenantId, nit: string): Promise<Supplier | null>;
  delete(id: SupplierId): Promise<void>;
}
