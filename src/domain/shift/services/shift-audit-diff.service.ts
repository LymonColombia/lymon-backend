import { Injectable } from '@nestjs/common';
import { UserId } from '@/domain/user/entities/user.entity';
import { PropertyId } from '@/domain/property/value-objects/property-id.vo';
import {
  type AuditDiffResult,
  buildAuditDiff,
} from '@/domain/shared/utils/audit-diff.util';

export interface ShiftForAudit {
  getStaffMemberIds(): UserId[];
  getPropertyId(): PropertyId;
  getName(): string;
  getStartDate(): Date;
  getEndDate(): Date | null;
  getStartHour(): string;
  getEndHour(): string;
  getWeekdays(): number[] | null;
  getNotes(): string | null;
}

@Injectable()
export class ShiftAuditDiffService {
  snapshot(shift: ShiftForAudit): Record<string, unknown> {
    const endDate = shift.getEndDate();
    return {
      staffMemberIds: shift.getStaffMemberIds().map((id) => id.toString()),
      propertyId: shift.getPropertyId().toString(),
      name: shift.getName(),
      startDate: this.formatDate(shift.getStartDate()),
      endDate: endDate ? this.formatDate(endDate) : null,
      startHour: shift.getStartHour(),
      endHour: shift.getEndHour(),
      weekdays: shift.getWeekdays(),
      notes: shift.getNotes(),
    };
  }

  diff(
    previousSnapshot: Record<string, unknown>,
    nextSnapshot: Record<string, unknown>,
  ): AuditDiffResult {
    return buildAuditDiff(previousSnapshot, nextSnapshot);
  }

  private formatDate(value: Date): string {
    return value.toISOString().slice(0, 10);
  }
}
