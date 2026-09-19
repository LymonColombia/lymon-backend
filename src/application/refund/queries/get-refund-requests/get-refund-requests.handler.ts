import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetRefundRequestsQuery } from './get-refund-requests.query';
import {
  REFUND_REQUEST_REPOSITORY,
  type RefundRequestRepository,
} from '@/domain/refund/repositories/refund-request.repository';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

export interface RefundRequestItem {
  id: string;
  reservationId: string;
  guestId: string;
  amount: number;
  status: string;
  requestedBy: string;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
}

export interface GetRefundRequestsResult {
  items: RefundRequestItem[];
  total: number;
  page: number;
  limit: number;
}

@QueryHandler(GetRefundRequestsQuery)
export class GetRefundRequestsHandler implements IQueryHandler<
  GetRefundRequestsQuery,
  GetRefundRequestsResult
> {
  constructor(
    @Inject(REFUND_REQUEST_REPOSITORY)
    private readonly refundRequestRepository: RefundRequestRepository,
  ) {}

  async execute(
    query: GetRefundRequestsQuery,
  ): Promise<GetRefundRequestsResult> {
    const tenantId = TenantId.createFromString(query.tenantId);
    const { items, total } = await this.refundRequestRepository.findByTenant(
      tenantId,
      query.page,
      query.limit,
      query.status,
    );

    return {
      items: items.map((r) => ({
        id: r.getId()?.toString() ?? '',
        reservationId: r.getReservationId().toString(),
        guestId: r.getGuestId().toString(),
        amount: r.getAmount(),
        status: r.getStatus().toString(),
        requestedBy: r.getRequestedBy(),
        reviewedBy: r.getReviewedBy(),
        reviewedAt: r.getReviewedAt(),
        createdAt: r.getCreatedAt(),
      })),
      total,
      page: query.page,
      limit: query.limit,
    };
  }
}
