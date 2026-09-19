import type { RefundRequest } from '@/domain/refund/entities/refund-request.entity';
import type { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

export const REFUND_REQUEST_REPOSITORY = 'REFUND_REQUEST_REPOSITORY';

export interface RefundRequestRepository {
  save(refundRequest: RefundRequest): Promise<string>;
  findById(id: string): Promise<RefundRequest | null>;
  findByTenant(
    tenantId: TenantId,
    page: number,
    limit: number,
    status?: string,
  ): Promise<{ items: RefundRequest[]; total: number }>;
  findByReservationId(reservationId: string): Promise<RefundRequest | null>;
}
