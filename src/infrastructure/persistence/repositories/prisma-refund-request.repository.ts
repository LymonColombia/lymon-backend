import { Injectable } from '@nestjs/common';
import { RefundRequest } from '@/domain/refund/entities/refund-request.entity';
import { RefundRequestId } from '@/domain/refund/value-objects/refund-request-id.vo';
import { RefundRequestStatus } from '@/domain/refund/value-objects/refund-request-status.vo';
import type { RefundRequestRepository } from '@/domain/refund/repositories/refund-request.repository';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { ReservationId } from '@/domain/reservation/value-objects/reservation-id.vo';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { PrismaService } from '@/infrastructure/persistence/prisma/prisma.service';
import { type refund_requests as RefundRequestRow } from '@/infrastructure/persistence/prisma/generated/client';

@Injectable()
export class PrismaRefundRequestRepository implements RefundRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(refundRequest: RefundRequest): Promise<string> {
    const id = refundRequest.getId()?.toString();

    const data = {
      amount: refundRequest.getAmount(),
      status: refundRequest.getStatus().toString(),
      requested_by: refundRequest.getRequestedBy(),
      reviewed_by: refundRequest.getReviewedBy(),
      reviewed_at: refundRequest.getReviewedAt(),
      reason: refundRequest.getReason(),
      updated_at: refundRequest.getUpdatedAt(),
    };

    if (id) {
      await this.prisma.refund_requests.update({ where: { id }, data });
      return id;
    }

    const created = await this.prisma.refund_requests.create({
      data: {
        ...data,
        tenant_id: refundRequest.getTenantId().toString(),
        reservation_id: refundRequest.getReservationId().toString(),
        guest_id: refundRequest.getGuestId().toString(),
        created_at: refundRequest.getCreatedAt(),
      },
    });
    return created.id;
  }

  async findById(id: string): Promise<RefundRequest | null> {
    const row = await this.prisma.refund_requests.findUnique({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByTenant(
    tenantId: TenantId,
    page: number,
    limit: number,
    status?: string,
  ): Promise<{ items: RefundRequest[]; total: number }> {
    const where = {
      tenant_id: tenantId.toString(),
      ...(status ? { status } : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.refund_requests.count({ where }),
      this.prisma.refund_requests.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { items: rows.map((row) => this.toDomain(row)), total };
  }

  async findByReservationId(
    reservationId: string,
  ): Promise<RefundRequest | null> {
    const row = await this.prisma.refund_requests.findFirst({
      where: { reservation_id: reservationId },
    });
    return row ? this.toDomain(row) : null;
  }

  private toDomain(row: RefundRequestRow): RefundRequest {
    return RefundRequest.reconstitute({
      id: RefundRequestId.createFromString(row.id),
      tenantId: TenantId.createFromString(row.tenant_id),
      reservationId: ReservationId.create(row.reservation_id),
      guestId: GuestId.createFromString(row.guest_id),
      amount: row.amount.toNumber(),
      status: RefundRequestStatus.create(row.status),
      requestedBy: row.requested_by,
      reviewedBy: row.reviewed_by,
      reviewedAt: row.reviewed_at,
      reason: row.reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}
