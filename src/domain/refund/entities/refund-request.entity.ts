import { RefundRequestId } from '@/domain/refund/value-objects/refund-request-id.vo';
import { RefundRequestStatus, RefundRequestStatusEnum } from '@/domain/refund/value-objects/refund-request-status.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { ReservationId } from '@/domain/reservation/value-objects/reservation-id.vo';
import { GuestId } from '@/domain/guest/value-objects/guest-id.vo';
import { DomainException } from '@/domain/shared/exceptions/domain.exception';

interface CreateRefundRequestParams {
  tenantId: TenantId;
  reservationId: ReservationId;
  guestId: GuestId;
  amount: number;
  reason?: string | null;
}

export class RefundRequest {
  private constructor(
    private readonly id: RefundRequestId | null,
    private readonly tenantId: TenantId,
    private readonly reservationId: ReservationId,
    private readonly guestId: GuestId,
    private readonly amount: number,
    private status: RefundRequestStatus,
    private readonly requestedBy: string,
    private reviewedBy: string | null,
    private reviewedAt: Date | null,
    private reason: string | null,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static create(params: CreateRefundRequestParams): RefundRequest {
    return new RefundRequest(
      null,
      params.tenantId,
      params.reservationId,
      params.guestId,
      params.amount,
      RefundRequestStatus.pending(),
      'guest',
      null,
      null,
      params.reason ?? null,
      new Date(),
      new Date(),
    );
  }

  static reconstitute(data: {
    id: RefundRequestId;
    tenantId: TenantId;
    reservationId: ReservationId;
    guestId: GuestId;
    amount: number;
    status: RefundRequestStatus;
    requestedBy: string;
    reviewedBy: string | null;
    reviewedAt: Date | null;
    reason: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): RefundRequest {
    return new RefundRequest(
      data.id,
      data.tenantId,
      data.reservationId,
      data.guestId,
      data.amount,
      data.status,
      data.requestedBy,
      data.reviewedBy,
      data.reviewedAt,
      data.reason,
      data.createdAt,
      data.updatedAt,
    );
  }

  approve(actorId: string): void {
    if (!this.status.canTransitionTo(RefundRequestStatusEnum.APPROVED)) {
      throw new DomainException('Refund request cannot be approved in its current state');
    }
    this.status = RefundRequestStatus.create(RefundRequestStatusEnum.APPROVED);
    this.reviewedBy = actorId;
    this.reviewedAt = new Date();
    this.touch();
  }

  deny(actorId: string): void {
    if (!this.status.canTransitionTo(RefundRequestStatusEnum.DENIED)) {
      throw new DomainException('Refund request cannot be denied in its current state');
    }
    this.status = RefundRequestStatus.create(RefundRequestStatusEnum.DENIED);
    this.reviewedBy = actorId;
    this.reviewedAt = new Date();
    this.touch();
  }

  getId(): RefundRequestId | null {
    return this.id;
  }

  getTenantId(): TenantId {
    return this.tenantId;
  }

  getReservationId(): ReservationId {
    return this.reservationId;
  }

  getGuestId(): GuestId {
    return this.guestId;
  }

  getAmount(): number {
    return this.amount;
  }

  getStatus(): RefundRequestStatus {
    return this.status;
  }

  getRequestedBy(): string {
    return this.requestedBy;
  }

  getReviewedBy(): string | null {
    return this.reviewedBy;
  }

  getReviewedAt(): Date | null {
    return this.reviewedAt;
  }

  getReason(): string | null {
    return this.reason;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  private touch(): void {
    this.updatedAt = new Date();
  }
}
