import { ExperiencePurchase } from '@/domain/experience-purchase/entities/experience-purchase.entity';
import { ExperiencePurchaseId } from '@/domain/experience-purchase/value-objects/experience-purchase-id.vo';
import {
  ExperiencePurchaseStatus,
  ExperiencePurchaseStatusEnum,
} from '@/domain/experience-purchase/value-objects/experience-purchase-status.vo';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';
import { ExperienceId } from '@/domain/experience/value-objects/experience-id.vo';

export const EXPERIENCE_PURCHASE_FIXTURE_DEFAULTS = {
  id: '65f1a1a2-b3c4-d5e6-f7a8-bc0100000000',
  tenantId: '65f1a1a2-b3c4-d5e6-f7a8-b9c200000000',
  guestAccountId: '65f1a1a2-b3c4-d5e6-f7a8-b9c000000000',
  experienceId: '65f1a1a2-b3c4-d5e6-f7a8-bb1000000000',
  quantity: 2,
  unitPriceCop: 50000,
  totalPriceCop: 100000,
  status: ExperiencePurchaseStatusEnum.PENDING,
  createdAt: new Date('2030-01-01T10:00:00Z'),
  updatedAt: new Date('2030-01-01T10:00:00Z'),
};

export function makeExperiencePurchase(
  overrides?: Partial<{
    id: string;
    tenantId: string;
    guestAccountId: string;
    experienceId: string;
    reservationId: string | null;
    selectedDate: Date | null;
    quantity: number;
    unitPriceCop: number;
    totalPriceCop: number;
    status: ExperiencePurchaseStatusEnum;
    paymentReference: string | null;
    createdAt: Date;
    updatedAt: Date;
  }>,
): ExperiencePurchase {
  const merged = { ...EXPERIENCE_PURCHASE_FIXTURE_DEFAULTS, ...overrides };
  return ExperiencePurchase.reconstitute({
    id: ExperiencePurchaseId.createFromString(merged.id),
    tenantId: TenantId.createFromString(merged.tenantId),
    guestAccountId: GuestAccountId.createFromString(merged.guestAccountId),
    experienceId: ExperienceId.create(merged.experienceId),
    reservationId: merged.reservationId ?? null,
    selectedDate: merged.selectedDate ?? null,
    quantity: merged.quantity,
    unitPriceCop: merged.unitPriceCop,
    totalPriceCop: merged.totalPriceCop,
    status: ExperiencePurchaseStatus.create(merged.status),
    paymentReference: merged.paymentReference ?? null,
    createdAt: merged.createdAt,
    updatedAt: merged.updatedAt,
  });
}
