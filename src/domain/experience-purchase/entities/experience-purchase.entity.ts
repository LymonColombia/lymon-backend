import { DomainException } from '@/domain/shared/exceptions/domain.exception';
import { ExperienceId } from '@/domain/experience/value-objects/experience-id.vo';
import { ExperiencePurchaseId } from '@/domain/experience-purchase/value-objects/experience-purchase-id.vo';
import {
  ExperiencePurchaseStatus,
  ExperiencePurchaseStatusEnum,
} from '@/domain/experience-purchase/value-objects/experience-purchase-status.vo';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import {
  ExperiencePurchaseCreateParams,
  IExperiencePurchaseData,
} from './experience-purchase.types';

export class ExperiencePurchase {
  private constructor(
    private readonly id: ExperiencePurchaseId | null,
    private readonly tenantId: TenantId,
    private readonly guestAccountId: GuestAccountId,
    private readonly experienceId: ExperienceId,
    private readonly reservationId: string | null,
    private readonly selectedDate: Date | null,
    private readonly quantity: number,
    private readonly unitPriceCop: number,
    private readonly totalPriceCop: number,
    private status: ExperiencePurchaseStatus,
    private paymentReference: string | null,
    private readonly createdAt: Date,
    private updatedAt: Date,
  ) {}

  static create(params: ExperiencePurchaseCreateParams): ExperiencePurchase {
    if (!Number.isInteger(params.quantity) || params.quantity <= 0) {
      throw new DomainException('Quantity must be a positive integer');
    }
    if (!Number.isFinite(params.unitPriceCop) || params.unitPriceCop <= 0) {
      throw new DomainException('Unit price must be greater than zero');
    }
    return new ExperiencePurchase(
      null,
      params.tenantId,
      params.guestAccountId,
      params.experienceId,
      params.reservationId ?? null,
      params.selectedDate ?? null,
      params.quantity,
      params.unitPriceCop,
      params.unitPriceCop * params.quantity,
      ExperiencePurchaseStatus.pending(),
      null,
      new Date(),
      new Date(),
    );
  }

  static reconstitute(data: IExperiencePurchaseData): ExperiencePurchase {
    return new ExperiencePurchase(
      data.id,
      data.tenantId,
      data.guestAccountId,
      data.experienceId,
      data.reservationId,
      data.selectedDate,
      data.quantity,
      data.unitPriceCop,
      data.totalPriceCop,
      data.status,
      data.paymentReference,
      data.createdAt,
      data.updatedAt,
    );
  }

  confirm(paymentReference: string): void {
    if (this.status.getValue() !== ExperiencePurchaseStatusEnum.PENDING) {
      throw new DomainException('Purchase is not in PENDING status');
    }
    this.status = ExperiencePurchaseStatus.create(
      ExperiencePurchaseStatusEnum.CONFIRMED,
    );
    this.paymentReference = paymentReference;
    this.touch();
  }

  cancel(): void {
    if (this.status.getValue() === ExperiencePurchaseStatusEnum.CANCELLED) {
      throw new DomainException('Purchase is already cancelled');
    }
    this.status = ExperiencePurchaseStatus.create(
      ExperiencePurchaseStatusEnum.CANCELLED,
    );
    this.touch();
  }

  getId(): ExperiencePurchaseId | null {
    return this.id;
  }

  getTenantId(): TenantId {
    return this.tenantId;
  }

  getGuestAccountId(): GuestAccountId {
    return this.guestAccountId;
  }

  getExperienceId(): ExperienceId {
    return this.experienceId;
  }

  getReservationId(): string | null {
    return this.reservationId;
  }

  getSelectedDate(): Date | null {
    return this.selectedDate;
  }

  getQuantity(): number {
    return this.quantity;
  }

  getUnitPriceCop(): number {
    return this.unitPriceCop;
  }

  getTotalPriceCop(): number {
    return this.totalPriceCop;
  }

  getStatus(): ExperiencePurchaseStatus {
    return this.status;
  }

  getPaymentReference(): string | null {
    return this.paymentReference;
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
