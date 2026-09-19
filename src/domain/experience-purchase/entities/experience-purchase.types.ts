import { ExperienceId } from '@/domain/experience/value-objects/experience-id.vo';
import { ExperiencePurchaseId } from '@/domain/experience-purchase/value-objects/experience-purchase-id.vo';
import { ExperiencePurchaseStatus } from '@/domain/experience-purchase/value-objects/experience-purchase-status.vo';
import { GuestAccountId } from '@/domain/guest-account/value-objects/guest-account-id.vo';
import { TenantId } from '@/domain/tenant/value-objects/tenant-id.vo';

export interface ExperiencePurchaseCreateParams {
  tenantId: TenantId;
  guestAccountId: GuestAccountId;
  experienceId: ExperienceId;
  reservationId?: string | null;
  selectedDate?: Date | null;
  quantity: number;
  unitPriceCop: number;
}

export interface IExperiencePurchaseData {
  id: ExperiencePurchaseId;
  tenantId: TenantId;
  guestAccountId: GuestAccountId;
  experienceId: ExperienceId;
  reservationId: string | null;
  selectedDate: Date | null;
  quantity: number;
  unitPriceCop: number;
  totalPriceCop: number;
  status: ExperiencePurchaseStatus;
  paymentReference: string | null;
  createdAt: Date;
  updatedAt: Date;
}
