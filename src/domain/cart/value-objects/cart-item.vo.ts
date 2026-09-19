import { ExperienceId } from '@/domain/experience/value-objects/experience-id.vo';
import { DomainException } from '@/domain/shared/exceptions/domain.exception';

export class CartItem {
  private constructor(
    readonly tenantId: string,
    readonly experienceId: ExperienceId,
    readonly experienceName: string,
    readonly selectedDate: Date | null,
    readonly quantity: number,
    readonly unitPriceCopSnapshot: number,
    readonly reservationId: string | null,
  ) {}

  static create(params: {
    tenantId: string;
    experienceId: ExperienceId;
    experienceName: string;
    selectedDate?: Date | null;
    quantity: number;
    unitPriceCopSnapshot: number;
    reservationId?: string | null;
  }): CartItem {
    if (!Number.isInteger(params.quantity) || params.quantity <= 0) {
      throw new DomainException(
        'Cart item quantity must be a positive integer',
      );
    }
    return new CartItem(
      params.tenantId,
      params.experienceId,
      params.experienceName,
      params.selectedDate ?? null,
      params.quantity,
      params.unitPriceCopSnapshot,
      params.reservationId ?? null,
    );
  }

  getTotalCop(): number {
    return this.quantity * this.unitPriceCopSnapshot;
  }

  matchesKey(experienceId: ExperienceId, selectedDate?: Date | null): boolean {
    if (!this.experienceId.equals(experienceId)) return false;
    const otherDate = selectedDate ?? null;
    if (!this.selectedDate && !otherDate) return true;
    if (!this.selectedDate || !otherDate) return false;
    return this.selectedDate.getTime() === otherDate.getTime();
  }
}
